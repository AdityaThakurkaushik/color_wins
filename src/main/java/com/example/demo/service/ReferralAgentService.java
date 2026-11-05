package com.example.demo.service;

import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.ReferralAgent;
import com.example.demo.entity.ReferralAgentEarning;
import com.example.demo.entity.ReferralSettings;
import com.example.demo.entity.User;
import com.example.demo.repository.BetRepository;
import com.example.demo.repository.DepositRepository;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.ReferralAgentEarningRepository;
import com.example.demo.repository.ReferralAgentRepository;
import com.example.demo.repository.ReferralSettingsRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ReferralAgentService {

    private static final short SETTINGS_ID = 1;

    private final ReferralAgentRepository agentRepository;
    private final ReferralAgentEarningRepository earningRepository;
    private final ReferralSettingsRepository referralSettingsRepository;
    private final UserRepository userRepository;
    private final BetRepository betRepository;
    private final DepositRepository depositRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final PasswordEncoder passwordEncoder;

    public ReferralAgentService(
            ReferralAgentRepository agentRepository,
            ReferralAgentEarningRepository earningRepository,
            ReferralSettingsRepository referralSettingsRepository,
            UserRepository userRepository,
            BetRepository betRepository,
            DepositRepository depositRepository,
            PointsTransactionRepository pointsTransactionRepository,
            PasswordEncoder passwordEncoder) {
        this.agentRepository = agentRepository;
        this.earningRepository = earningRepository;
        this.referralSettingsRepository = referralSettingsRepository;
        this.userRepository = userRepository;
        this.betRepository = betRepository;
        this.depositRepository = depositRepository;
        this.pointsTransactionRepository = pointsTransactionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ReferralAgent create(String rawUsername, String rawPassword, String displayName, String rawCode) {
        String username = normalizeUsername(rawUsername);
        if (agentRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Username already exists");
        }
        String code = (rawCode == null || rawCode.isBlank())
                ? generateCode()
                : normalizeCode(rawCode);
        if (agentRepository.existsByAgentCodeIgnoreCase(code)) {
            throw new IllegalArgumentException("Agent code already exists");
        }
        if (rawPassword == null || rawPassword.length() < 8 || rawPassword.length() > 72) {
            throw new IllegalArgumentException("Password must be 8 to 72 characters");
        }
        String name = displayName == null || displayName.isBlank() ? username : displayName.trim();
        return agentRepository.save(new ReferralAgent(
                code,
                username,
                passwordEncoder.encode(rawPassword),
                name.length() > 60 ? name.substring(0, 60) : name));
    }

    @Transactional(readOnly = true)
    public ReferralAgent login(String rawUsername, String rawPassword) {
        ReferralAgent agent = agentRepository.findByUsernameIgnoreCase(normalizeUsername(rawUsername))
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));
        if (!agent.isActive()) {
            throw new IllegalArgumentException("Agent account is blocked");
        }
        if (!passwordEncoder.matches(rawPassword, agent.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }
        return agent;
    }

    @Transactional(readOnly = true)
    public List<ReferralAgent> list() {
        return agentRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public ReferralAgent require(Long id) {
        return agentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Referral agent not found"));
    }

    @Transactional(readOnly = true)
    public ReferralAgent requireActiveByCode(String rawCode) {
        ReferralAgent agent = agentRepository.findByAgentCodeIgnoreCase(normalizeCode(rawCode))
                .orElseThrow(() -> new IllegalArgumentException("Invalid agent referral code"));
        if (!agent.isActive()) {
            throw new IllegalArgumentException("This agent referral link is disabled");
        }
        return agent;
    }

    @Transactional
    public ReferralAgent setActive(Long id, boolean active) {
        ReferralAgent agent = require(id);
        agent.setActive(active);
        return agentRepository.save(agent);
    }

    @Transactional
    public ReferralAgent resetPassword(Long id, String rawPassword) {
        if (rawPassword == null || rawPassword.length() < 8 || rawPassword.length() > 72) {
            throw new IllegalArgumentException("Password must be 8 to 72 characters");
        }
        ReferralAgent agent = require(id);
        agent.setPasswordHash(passwordEncoder.encode(rawPassword));
        return agentRepository.save(agent);
    }

    @Transactional
    public void creditSignupReward(User savedUser) {
        if (savedUser.getReferredByAgentId() == null) {
            return;
        }
        ReferralSettings settings = referralSettingsRepository.findById(SETTINGS_ID).orElse(null);
        if (settings == null || !Boolean.TRUE.equals(settings.getEnabled())) {
            return;
        }

        long newUserReward = settings.getReferredUserReward() == null ? 0L : settings.getReferredUserReward();
        long agentReward = settings.getReferrerReward() == null ? 0L : settings.getReferrerReward();
        String newUserKey = "REFERRAL_AGENT_NEW_USER_" + savedUser.getId();
        String agentKey = "REFERRAL_AGENT_SIGNUP_" + savedUser.getId();

        User userForUpdate = userRepository.findByIdForUpdate(savedUser.getId())
                .orElseThrow(() -> new IllegalStateException("User not found"));
        ReferralAgent agent = agentRepository.findByIdForUpdate(savedUser.getReferredByAgentId()).orElse(null);
        if (agent == null || !agent.isActive()) {
            return;
        }

        if (newUserReward > 0 && pointsTransactionRepository.findByIdempotencyKey(newUserKey).isEmpty()) {
            userForUpdate.setVirtualPoints(Math.addExact(userForUpdate.getVirtualPoints(), newUserReward));
            pointsTransactionRepository.save(new PointsTransaction(
                    userForUpdate,
                    newUserReward,
                    "REFERRAL_BONUS",
                    newUserKey,
                    "Agent referral signup reward: " + newUserReward + " coins"));
        }

        if (agentReward > 0 && earningRepository.findByIdempotencyKey(agentKey).isEmpty()) {
            agent.setVirtualPoints(Math.addExact(agent.getVirtualPoints(), agentReward));
            earningRepository.save(new ReferralAgentEarning(
                    agent,
                    userForUpdate,
                    null,
                    "SIGNUP",
                    null,
                    0L,
                    agentReward,
                    agentKey));
        }
    }

    @Transactional
    public void creditDepositCommission(User depositor, long depositId, long depositAmount) {
        if (depositor.getReferredByAgentId() == null || depositAmount <= 0) {
            return;
        }
        ReferralSettings settings = referralSettingsRepository.findById(SETTINGS_ID).orElse(null);
        if (settings == null || !Boolean.TRUE.equals(settings.getEnabled())) {
            return;
        }

        String key = "REFERRAL_AGENT_DEPOSIT_" + depositId;
        if (earningRepository.findByIdempotencyKey(key).isPresent()) {
            return;
        }

        ReferralAgent agent = agentRepository.findByIdForUpdate(depositor.getReferredByAgentId()).orElse(null);
        if (agent == null || !agent.isActive()) {
            return;
        }

        // After approve, current deposit is APPROVED — first when count == 1
        long approvedCount = depositRepository.countByUserIdAndStatus(depositor.getId(), "APPROVED");
        boolean first = approvedCount <= 1;
        BigDecimal percent = first
                ? settings.getAgentFirstDepositPercent()
                : settings.getAgentNextDepositPercent();
        if (percent == null || percent.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        long coins = percent.multiply(BigDecimal.valueOf(depositAmount))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN)
                .longValue();
        if (coins <= 0) {
            return;
        }

        agent.setVirtualPoints(Math.addExact(agent.getVirtualPoints(), coins));
        earningRepository.save(new ReferralAgentEarning(
                agent,
                depositor,
                depositId,
                first ? "FIRST_DEPOSIT" : "NEXT_DEPOSIT",
                percent,
                depositAmount,
                coins,
                key));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(Long agentId) {
        ReferralAgent agent = require(agentId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", agent.getId());
        body.put("username", agent.getUsername());
        body.put("displayName", agent.getDisplayName());
        body.put("agentCode", agent.getAgentCode());
        body.put("referralLink", "https://millionairehub.tech/?aref=" + agent.getAgentCode());
        body.put("active", agent.isActive());
        body.put("balance", agent.getVirtualPoints());
        body.put("totalReferrals", userRepository.countByReferredByAgentId(agent.getId()));
        body.put("totalEarned", earningRepository.sumCoinsByAgentId(agent.getId()));
        body.put("signupEarned", earningRepository.sumCoinsByAgentIdAndKind(agent.getId(), "SIGNUP"));
        body.put("firstDepositEarned", earningRepository.sumCoinsByAgentIdAndKind(agent.getId(), "FIRST_DEPOSIT"));
        body.put("nextDepositEarned", earningRepository.sumCoinsByAgentIdAndKind(agent.getId(), "NEXT_DEPOSIT"));
        ReferralSettings settings = referralSettingsRepository.findById(SETTINGS_ID).orElse(null);
        if (settings != null) {
            body.put("signupReward", settings.getReferrerReward());
            body.put("firstDepositPercent", settings.getAgentFirstDepositPercent());
            body.put("nextDepositPercent", settings.getAgentNextDepositPercent());
        }
        return body;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> referrals(Long agentId) {
        require(agentId);
        List<User> users = userRepository.findByReferredByAgentIdOrderByCreatedAtDesc(agentId);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (User user : users) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("username", user.getUsername());
            row.put("displayName", user.getDisplayName() == null ? user.getUsername() : user.getDisplayName());
            row.put("joinedAt", user.getCreatedAt());
            row.put("betsCount", betRepository.countByUserId(user.getId()));
            row.put("verified", user.isEmailVerified());
            rows.add(row);
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> earnings(Long agentId) {
        require(agentId);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (ReferralAgentEarning earning : earningRepository.findByAgentIdOrderByCreatedAtDesc(agentId)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", earning.getId());
            row.put("kind", earning.getKind());
            row.put("percent", earning.getPercent());
            row.put("baseAmount", earning.getBaseAmount());
            row.put("coins", earning.getCoins());
            row.put("createdAt", earning.getCreatedAt());
            User u = earning.getReferredUser();
            row.put("username", u == null ? null : u.getUsername());
            row.put("displayName", u == null ? null : (u.getDisplayName() == null ? u.getUsername() : u.getDisplayName()));
            rows.add(row);
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminView(ReferralAgent agent) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", agent.getId());
        body.put("username", agent.getUsername());
        body.put("displayName", agent.getDisplayName());
        body.put("agentCode", agent.getAgentCode());
        body.put("referralLink", "https://millionairehub.tech/?aref=" + agent.getAgentCode());
        body.put("active", agent.isActive());
        body.put("balance", agent.getVirtualPoints());
        body.put("totalReferrals", userRepository.countByReferredByAgentId(agent.getId()));
        body.put("totalEarned", earningRepository.sumCoinsByAgentId(agent.getId()));
        body.put("createdAt", agent.getCreatedAt());
        return body;
    }

    private String generateCode() {
        String code;
        do {
            code = "RA" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
        } while (agentRepository.existsByAgentCodeIgnoreCase(code));
        return code;
    }

    private static String normalizeUsername(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        String value = raw.trim();
        if (value.length() < 3 || value.length() > 40) {
            throw new IllegalArgumentException("Username must be 3 to 40 characters");
        }
        return value;
    }

    private static String normalizeCode(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Agent code is required");
        }
        String value = raw.trim().toUpperCase(Locale.ROOT);
        if (value.length() < 4 || value.length() > 30) {
            throw new IllegalArgumentException("Agent code must be 4 to 30 characters");
        }
        return value;
    }
}
