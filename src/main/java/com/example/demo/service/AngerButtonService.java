package com.example.demo.service;

import com.example.demo.entity.AngerButtonSetting;
import com.example.demo.entity.AngerButtonUser;
import com.example.demo.entity.User;
import com.example.demo.repository.AngerButtonSettingRepository;
import com.example.demo.repository.AngerButtonUserRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AngerButtonService {

    private static final short SETTING_ID = 1;

    private final AngerButtonSettingRepository settingRepository;
    private final AngerButtonUserRepository userLabelRepository;
    private final UserRepository userRepository;

    public AngerButtonService(
            AngerButtonSettingRepository settingRepository,
            AngerButtonUserRepository userLabelRepository,
            UserRepository userRepository) {
        this.settingRepository = settingRepository;
        this.userLabelRepository = userLabelRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Resolved resolve(Long userId) {
        return userLabelRepository.findById(userId)
                .map(row -> new Resolved(row.getLabel(), "DEDICATED"))
                .orElseGet(() -> new Resolved(global().getLabel(), "GLOBAL"));
    }

    @Transactional(readOnly = true)
    public AdminView adminView() {
        List<Dedicated> rows = userLabelRepository.listNamed().stream()
                .map(row -> new Dedicated(row.getUsername(), row.getLabel()))
                .toList();
        return new AdminView(global().getLabel(), rows);
    }

    @Transactional
    public AdminView updateGlobal(String label) {
        AngerButtonSetting setting = global();
        setting.setLabel(clean(label));
        settingRepository.save(setting);
        return adminView();
    }

    @Transactional
    public AdminView saveDedicated(String username, String label) {
        User user = userRepository.findByUsername(username == null ? "" : username.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        String text = clean(label);
        AngerButtonUser row = userLabelRepository.findById(user.getId())
                .orElseGet(() -> new AngerButtonUser(user.getId(), text));
        row.setLabel(text);
        userLabelRepository.save(row);
        return adminView();
    }

    @Transactional
    public AdminView deleteDedicated(String username) {
        User user = userRepository.findByUsername(username == null ? "" : username.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        userLabelRepository.deleteById(user.getId());
        return adminView();
    }

    private AngerButtonSetting global() {
        return settingRepository.findById(SETTING_ID).orElseGet(() -> {
            AngerButtonSetting created = new AngerButtonSetting();
            created.setLabel("LET IT OUT");
            return settingRepository.save(created);
        });
    }

    private String clean(String label) {
        String text = label == null ? "" : label.trim().replaceAll("\\s+", " ");
        if (text.isEmpty() || text.length() > 32) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Button text must be 1 to 32 characters");
        }
        return text;
    }

    public record Resolved(String label, String scope) {
    }

    public record Dedicated(String username, String label) {
    }

    public record AdminView(String label, List<Dedicated> users) {
    }
}
