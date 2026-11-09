package com.example.demo.service;

import com.example.demo.entity.PointsTransaction;
import com.example.demo.entity.ReferralAgent;
import com.example.demo.entity.ReferralAgentEarning;
import com.example.demo.entity.ReferralAgentMessage;
import com.example.demo.entity.ReferralAgentWithdrawal;
import com.example.demo.entity.ReferralSettings;
import com.example.demo.entity.User;
import com.example.demo.repository.BetRepository;
import com.example.demo.repository.DepositRepository;
import com.example.demo.repository.PointsTransactionRepository;
import com.example.demo.repository.ReferralAgentEarningRepository;
import com.example.demo.repository.ReferralAgentMessageRepository;
import com.example.demo.repository.ReferralAgentRepository;
import com.example.demo.repository.ReferralAgentWithdrawalRepository;
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
    private static final long MAX_WITHDRAWAL = 500_000L;

    private final ReferralAgentRepository agentRepository;
    private final ReferralAgentEarningRepository earningRepository;
    private final ReferralAgentWithdrawalRepository withdrawalRepository;
    private final ReferralAgentMessageRepository messageRepository;
    private final ReferralSettingsRepository referralSettingsRepository;
    private final UserRepository userRepository;
    private final BetRepository betRepository;
    private final DepositRepository depositRepository;
    private final PointsTransactionRepository pointsTransactionRepository;
    private final PasswordEncoder passwordEncoder;

    public ReferralAgentService(
            ReferralAgentRepository agentRepository,
            ReferralAgentEarningRepository earningRepository,
            ReferralAgentWithdrawalRepository withdrawalRepository,
            ReferralAgentMessageRepository messageRepository,
            ReferralSettingsRepository referralSettingsRepository,
            UserRepository userRepository,
            BetRepository betRepository,
            DepositRepository depositRepository,
            PointsTransactionRepository pointsTransactionRepository,
            PasswordEncoder passwordEncoder) {
        this.agentRepository = agentRepository;
        this.earningRepository = earningRepository;
        this.withdrawalRepository = withdrawalRepository;
        this.messageRepository = messageRepository;
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
        String code = (rawCode == null || rawCode.isBlank()) ? generateCode() : normalizeCode(rawCode);
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
    public ReferralAgent updateAdmin(
            Long id,
            String displayName,
            String agentCode,
            BigDecimal firstDepositPercent,
            BigDecimal nextDepositPercent,
            boolean clearFirstPercent,
            boolean clearNextPercent,
            Long minBalance,
            boolean clearMinBalance) {
        ReferralAgent agent = require(id);
        if (displayName != null) {
            String name = displayName.trim();
            if (name.isBlank()) {
                throw new IllegalArgumentException("Display name is required.");
            }
            agent.setDisplayName(name.length() > 60 ? name.substring(0, 60) : name);
        }
        if (agentCode != null && !agentCode.isBlank()) {
            String code = normalizeCode(agentCode);
            if (!code.equalsIgnoreCase(agent.getAgentCode())
                    && agentRepository.existsByAgentCodeIgnoreCase(code)) {
                throw new IllegalArgumentException("This agent code is already in use.");
            }
            agent.setAgentCode(code);
        }
        if (clearFirstPercent) {
            agent.setFirstDepositPercent(null);
        } else if (firstDepositPercent != null) {
            agent.setFirstDepositPercent(validPercent(firstDepositPercent));
        }
        if (clearNextPercent) {
            agent.setNextDepositPercent(null);
        } else if (nextDepositPercent != null) {
            agent.setNextDepositPercent(validPercent(nextDepositPercent));
        }
        if (clearMinBalance) {
            agent.setMinBalance(null);
        } else if (minBalance != null) {
            if (minBalance < 0) {
                throw new IllegalArgumentException("Minimum balance cannot be negative.");
            }
            agent.setMinBalance(minBalance);
        }
        return agentRepository.save(agent);
    }

    @Transactional
    public ReferralAgent updateProfile(Long id, String displayName, String phone, String payoutNote) {
        ReferralAgent agent = require(id);
        if (!agent.isActive()) {
            throw new IllegalArgumentException("Agent account is blocked");
        }
        if (displayName != null) {
            String name = displayName.trim();
            if (name.isBlank() || name.length() > 60) {
                throw new IllegalArgumentException("Display name must be 1 to 60 characters");
            }
            agent.setDisplayName(name);
        }
        if (phone != null) {
            String value = phone.trim();
            if (!value.isEmpty() && !value.matches("[0-9+]{8,20}")) {
                throw new IllegalArgumentException("Phone must be 8 to 20 digits");
            }
            agent.setPhone(value.isEmpty() ? null : value);
        }
        if (payoutNote != null) {
            String note = payoutNote.trim();
            if (note.length() > 200) {
                throw new IllegalArgumentException("Note must be at most 200 characters");
            }
            agent.setPayoutNote(note.isEmpty() ? null : note);
        }
        return agentRepository.save(agent);
    }

    @Transactional
    public ReferralAgent adjustBalance(Long id, long delta, String note) {
        if (delta == 0) {
            throw new IllegalArgumentException("Balance change cannot be zero");
        }
        ReferralAgent agent = agentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Referral agent not found"));
        long next = Math.addExact(agent.getVirtualPoints(), delta);
        if (next < 0) {
            throw new IllegalArgumentException("Insufficient agent balance");
        }
        agent.setVirtualPoints(next);
        String key = "REFERRAL_AGENT_ADJUST_" + id + "_" + System.currentTimeMillis() + "_" + Math.abs(delta);
        earningRepository.save(new ReferralAgentEarning(
                agent,
                null,
                null,
                "ADJUST",
                null,
                delta,
                Math.abs(delta),
                key.length() > 80 ? key.substring(0, 80) : key));
        return agentRepository.save(agent);
    }

    @Transactional
    public void delete(Long id) {
        ReferralAgent agent = require(id);
        if (withdrawalRepository.findByAgentIdOrderByCreatedAtDesc(id).stream()
                .anyMatch(w -> "PENDING".equals(w.getStatus()))) {
            throw new IllegalArgumentException("Resolve pending withdrawals before deleting");
        }
        userRepository.clearReferredByAgentId(id);
        messageRepository.deleteByAgentId(id);
        earningRepository.deleteByAgentId(id);
        withdrawalRepository.deleteByAgentId(id);
        agentRepository.delete(agent);
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

        long approvedCount = depositRepository.countByUserIdAndStatus(depositor.getId(), "APPROVED");
        boolean first = approvedCount <= 1;
        BigDecimal percent = first ? resolveFirstPercent(agent, settings) : resolveNextPercent(agent, settings);
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

    @Transactional
    public ReferralAgentWithdrawal requestWithdrawal(
            Long agentId,
            long amount,
            String payoutMethod,
            String accountHolderName,
            String upiId,
            String bankName,
            String bankAccountNumber,
            String bankIfsc) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Enter a withdraw amount greater than 0.");
        }
        if (amount > MAX_WITHDRAWAL) {
            throw new IllegalArgumentException("Maximum withdraw amount is " + MAX_WITHDRAWAL + " coins.");
        }

        String method = payoutMethod == null ? "" : payoutMethod.trim().toUpperCase(Locale.ROOT);
        String holder = accountHolderName == null ? "" : accountHolderName.trim();
        String normalizedUpi = clean(upiId);
        String normalizedBank = clean(bankName);
        String normalizedAccount = cleanDigits(bankAccountNumber);
        String normalizedIfsc = bankIfsc == null
                ? null
                : bankIfsc.replaceAll("\\s+", "").trim().toUpperCase(Locale.ROOT);
        if (normalizedIfsc != null && normalizedIfsc.isBlank()) {
            normalizedIfsc = null;
        }

        if (holder.isBlank() || holder.length() > 100) {
            throw new IllegalArgumentException("Please enter the account holder name.");
        }
        if ("UPI".equals(method)) {
            if (normalizedUpi == null || normalizedUpi.length() > 100
                    || !normalizedUpi.matches("[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}")) {
                throw new IllegalArgumentException("Please enter a valid UPI ID (example: name@bank).");
            }
            normalizedBank = null;
            normalizedAccount = null;
            normalizedIfsc = null;
        } else if ("BANK".equals(method)) {
            if (normalizedBank == null || normalizedBank.length() > 100) {
                throw new IllegalArgumentException("Please enter the bank name.");
            }
            if (normalizedAccount == null || !normalizedAccount.matches("[0-9]{6,34}")) {
                throw new IllegalArgumentException("Please enter a valid account number (6–34 digits).");
            }
            if (normalizedIfsc == null || !normalizedIfsc.matches("[A-Z]{4}0[A-Z0-9]{6}")) {
                throw new IllegalArgumentException("Please enter a valid IFSC code (example: HDFC0001234).");
            }
            normalizedUpi = null;
        } else {
            throw new IllegalArgumentException("Please choose UPI or Bank as the payout method.");
        }

        ReferralAgent agent = agentRepository.findByIdForUpdate(agentId)
                .orElseThrow(() -> new IllegalArgumentException("Referral agent not found."));
        if (!agent.isActive()) {
            throw new IllegalArgumentException("Your agent account is blocked. Contact admin for help.");
        }

        ReferralSettings settings = referralSettingsRepository.findById(SETTINGS_ID).orElse(null);
        long minBalance = resolveMinBalance(agent, settings);
        long withdrawable = Math.max(0L, agent.getVirtualPoints() - minBalance);
        if (withdrawable <= 0) {
            throw new IllegalArgumentException(
                    "No coins available to withdraw. A minimum balance of "
                            + minBalance + " must remain in your account.");
        }
        if (amount > withdrawable) {
            throw new IllegalArgumentException(
                    "You can withdraw up to " + withdrawable
                            + " coins. A minimum balance of " + minBalance
                            + " must remain in your account.");
        }

        ReferralAgentWithdrawal withdrawal = withdrawalRepository.save(new ReferralAgentWithdrawal(
                agent,
                amount,
                method,
                holder,
                normalizedUpi,
                normalizedBank,
                normalizedAccount,
                normalizedIfsc));
        agent.setVirtualPoints(agent.getVirtualPoints() - amount);
        return withdrawal;
    }

    @Transactional
    public int sendMessage(Long agentIdOrNull, String rawTitle, String rawBody) {
        String title = sanitizeText(rawTitle, 120, "Title");
        String body = sanitizeText(rawBody, 2000, "Message");
        List<ReferralAgent> targets;
        if (agentIdOrNull == null) {
            targets = agentRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(ReferralAgent::isActive)
                    .toList();
            if (targets.isEmpty()) {
                throw new IllegalArgumentException("No active agents available to receive this message.");
            }
        } else {
            ReferralAgent agent = require(agentIdOrNull);
            if (!agent.isActive()) {
                throw new IllegalArgumentException("This agent account is blocked.");
            }
            targets = List.of(agent);
        }
        for (ReferralAgent agent : targets) {
            messageRepository.save(new ReferralAgentMessage(agent.getId(), title, body));
        }
        return targets.size();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> messagesForAgent(Long agentId) {
        require(agentId);
        return messageRepository.findByAgentIdOrderByCreatedAtDesc(agentId).stream()
                .map(this::messageView)
                .toList();
    }

    @Transactional
    public Map<String, Object> acknowledgeMessage(Long agentId, Long messageId) {
        ReferralAgentMessage message = messageRepository.findByIdAndAgentId(messageId, agentId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found."));
        if (!message.isAcknowledged()) {
            message.acknowledge();
            messageRepository.save(message);
        }
        return messageView(message);
    }

    @Transactional
    public Map<String, Object> markWithdrawalPaid(Long withdrawalId) {
        ReferralAgentWithdrawal withdrawal = withdrawalRepository.findByIdForUpdate(withdrawalId)
                .orElseThrow(() -> new IllegalArgumentException("Withdrawal not found"));
        if (!"PENDING".equals(withdrawal.getStatus())) {
            throw new IllegalArgumentException("Only a pending withdrawal can be paid");
        }
        withdrawal.markPaid();
        return withdrawalView(withdrawal);
    }

    @Transactional
    public Map<String, Object> rejectWithdrawal(Long withdrawalId, String reason) {
        if (reason == null || reason.isBlank() || reason.trim().length() > 255) {
            throw new IllegalArgumentException("A reject reason is required");
        }
        ReferralAgentWithdrawal withdrawal = withdrawalRepository.findByIdForUpdate(withdrawalId)
                .orElseThrow(() -> new IllegalArgumentException("Withdrawal not found"));
        if (!"PENDING".equals(withdrawal.getStatus())) {
            throw new IllegalArgumentException("Only a pending withdrawal can be rejected");
        }
        ReferralAgent agent = agentRepository.findByIdForUpdate(withdrawal.getAgent().getId())
                .orElseThrow(() -> new IllegalStateException("Referral agent not found"));
        agent.setVirtualPoints(Math.addExact(agent.getVirtualPoints(), withdrawal.getAmount()));
        withdrawal.reject(reason.trim());
        return withdrawalView(withdrawal);
    }

    @Transactional
    public Map<String, Object> requestWithdrawalView(
            Long agentId,
            long amount,
            String payoutMethod,
            String accountHolderName,
            String upiId,
            String bankName,
            String bankAccountNumber,
            String bankIfsc) {
        return withdrawalView(requestWithdrawal(
                agentId, amount, payoutMethod, accountHolderName, upiId, bankName, bankAccountNumber, bankIfsc));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(Long agentId) {
        ReferralAgent agent = require(agentId);
        ReferralSettings settings = referralSettingsRepository.findById(SETTINGS_ID).orElse(null);
        Map<String, Object> body = adminView(agent);
        body.put("phone", agent.getPhone());
        body.put("payoutNote", agent.getPayoutNote());
        body.put("signupEarned", earningRepository.sumCoinsByAgentIdAndKind(agent.getId(), "SIGNUP"));
        body.put("firstDepositEarned", earningRepository.sumCoinsByAgentIdAndKind(agent.getId(), "FIRST_DEPOSIT"));
        body.put("nextDepositEarned", earningRepository.sumCoinsByAgentIdAndKind(agent.getId(), "NEXT_DEPOSIT"));
        body.put("unreadMessages", messageRepository.countByAgentIdAndAcknowledgedFalse(agent.getId()));
        if (settings != null) {
            body.put("signupReward", settings.getReferrerReward());
            body.put("firstDepositPercent", resolveFirstPercent(agent, settings));
            body.put("nextDepositPercent", resolveNextPercent(agent, settings));
            body.put("globalFirstDepositPercent", settings.getAgentFirstDepositPercent());
            body.put("globalNextDepositPercent", settings.getAgentNextDepositPercent());
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
            row.put("id", user.getId());
            row.put("username", user.getUsername());
            row.put("displayName", user.getDisplayName() == null ? user.getUsername() : user.getDisplayName());
            row.put("email", user.getEmail());
            row.put("mobile", user.getMobileNumber());
            row.put("balance", user.getVirtualPoints());
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
            rows.add(earningView(earning));
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> withdrawals(Long agentId) {
        require(agentId);
        return withdrawalRepository.findByAgentIdOrderByCreatedAtDesc(agentId).stream()
                .map(this::withdrawalView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendingWithdrawals() {
        return withdrawalRepository.findByStatusOrderByCreatedAtAsc("PENDING").stream()
                .map(this::withdrawalView)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminView(ReferralAgent agent) {
        ReferralSettings settings = referralSettingsRepository.findById(SETTINGS_ID).orElse(null);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", agent.getId());
        body.put("username", agent.getUsername());
        body.put("displayName", agent.getDisplayName());
        body.put("phone", agent.getPhone());
        body.put("payoutNote", agent.getPayoutNote());
        body.put("agentCode", agent.getAgentCode());
        body.put("referralLink", "https://millionairehub.tech/?aref=" + agent.getAgentCode());
        body.put("active", agent.isActive());
        body.put("balance", agent.getVirtualPoints());
        body.put("totalReferrals", userRepository.countByReferredByAgentId(agent.getId()));
        body.put("totalEarned", earningRepository.sumCoinsByAgentId(agent.getId()));
        body.put("firstDepositPercent", agent.getFirstDepositPercent());
        body.put("nextDepositPercent", agent.getNextDepositPercent());
        body.put("minBalance", agent.getMinBalance());
        long effectiveMin = resolveMinBalance(agent, settings);
        body.put("effectiveMinBalance", effectiveMin);
        body.put("withdrawableBalance", Math.max(0L, agent.getVirtualPoints() - effectiveMin));
        if (settings != null) {
            body.put("effectiveFirstDepositPercent", resolveFirstPercent(agent, settings));
            body.put("effectiveNextDepositPercent", resolveNextPercent(agent, settings));
            body.put("globalFirstDepositPercent", settings.getAgentFirstDepositPercent());
            body.put("globalNextDepositPercent", settings.getAgentNextDepositPercent());
            body.put("globalMinAgentBalance", settings.getMinAgentBalance());
        }
        body.put("createdAt", agent.getCreatedAt());
        return body;
    }

    private Map<String, Object> messageView(ReferralAgentMessage message) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", message.getId());
        row.put("title", message.getTitle());
        row.put("body", message.getBody());
        row.put("acknowledged", message.isAcknowledged());
        row.put("acknowledgedAt", message.getAcknowledgedAt());
        row.put("createdAt", message.getCreatedAt());
        return row;
    }

    private long resolveMinBalance(ReferralAgent agent, ReferralSettings settings) {
        if (agent.getMinBalance() != null) {
            return agent.getMinBalance();
        }
        if (settings != null && settings.getMinAgentBalance() != null) {
            return settings.getMinAgentBalance();
        }
        return 0L;
    }

    private static String sanitizeText(String raw, int max, String label) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException(label + " is required.");
        }
        String value = raw.replace('\u0000', ' ').trim();
        if (value.isBlank()) {
            throw new IllegalArgumentException(label + " is required.");
        }
        if (value.length() > max) {
            throw new IllegalArgumentException(label + " must be at most " + max + " characters.");
        }
        return value;
    }

    private Map<String, Object> earningView(ReferralAgentEarning earning) {
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
        return row;
    }

    private Map<String, Object> withdrawalView(ReferralAgentWithdrawal withdrawal) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", withdrawal.getId());
        row.put("agentId", withdrawal.getAgent().getId());
        row.put("agentUsername", withdrawal.getAgent().getUsername());
        row.put("agentDisplayName", withdrawal.getAgent().getDisplayName());
        row.put("amount", withdrawal.getAmount());
        row.put("status", withdrawal.getStatus());
        row.put("payoutMethod", withdrawal.getPayoutMethod());
        row.put("accountHolderName", withdrawal.getAccountHolderName());
        row.put("upiId", withdrawal.getUpiId());
        row.put("bankName", withdrawal.getBankName());
        row.put("bankAccountNumber", withdrawal.getBankAccountNumber());
        row.put("bankIfsc", withdrawal.getBankIfsc());
        row.put("rejectReason", withdrawal.getRejectReason());
        row.put("createdAt", withdrawal.getCreatedAt());
        row.put("resolvedAt", withdrawal.getResolvedAt());
        return row;
    }

    private BigDecimal resolveFirstPercent(ReferralAgent agent, ReferralSettings settings) {
        if (agent.getFirstDepositPercent() != null) {
            return agent.getFirstDepositPercent();
        }
        return settings == null ? BigDecimal.ZERO : settings.getAgentFirstDepositPercent();
    }

    private BigDecimal resolveNextPercent(ReferralAgent agent, ReferralSettings settings) {
        if (agent.getNextDepositPercent() != null) {
            return agent.getNextDepositPercent();
        }
        return settings == null ? BigDecimal.ZERO : settings.getAgentNextDepositPercent();
    }

    private static BigDecimal validPercent(BigDecimal percent) {
        if (percent.compareTo(BigDecimal.ZERO) < 0 || percent.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Percent must be between 0 and 100");
        }
        return percent.setScale(2, RoundingMode.HALF_UP);
    }

    private String generateCode() {
        String code;
        do {
            code = "RA" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
        } while (agentRepository.existsByAgentCodeIgnoreCase(code));
        return code;
    }

    private static String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String cleanDigits(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String digits = value.replaceAll("[^0-9]", "");
        return digits.isBlank() ? null : digits;
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
        if (!value.matches("[A-Z0-9_-]+")) {
            throw new IllegalArgumentException("Agent code can only use A-Z, 0-9, _ and -");
        }
        return value;
    }
}
