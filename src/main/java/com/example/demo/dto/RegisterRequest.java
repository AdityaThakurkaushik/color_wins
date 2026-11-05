package com.example.demo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 40, message = "Name must be 2 to 40 characters")
    private String name;

    @NotBlank(message = "State is required")
    @Size(max = 60, message = "State is too long")
    private String state;

    @NotBlank(message = "Gmail is required")
    @Email(message = "Enter a valid Gmail address")
    private String email;

    @NotBlank(message = "Mobile number is required")
    @Pattern(
        regexp = "^[6-9][0-9]{9}$",
        message = "Mobile number must be a 10-digit Indian number"
    )
    private String mobileNumber;

    @NotNull(message = "Age is required")
    @Min(value = 18, message = "You must be at least 18")
    @Max(value = 99, message = "Age must be 99 or less")
    private Integer age;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters")
    private String password;

    private String referralCode;

    /** Special referral-agent code from ?aref= */
    private String agentReferralCode;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getReferralCode() {
        return referralCode;
    }

    public void setReferralCode(String referralCode) {
        this.referralCode = referralCode;
    }

    public String getAgentReferralCode() {
        return agentReferralCode;
    }

    public void setAgentReferralCode(String agentReferralCode) {
        this.agentReferralCode = agentReferralCode;
    }
}
