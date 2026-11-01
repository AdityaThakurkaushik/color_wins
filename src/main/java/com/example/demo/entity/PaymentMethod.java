package com.example.demo.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "payment_methods")
public class PaymentMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String label;

    @Column(name = "upi_id", nullable = false, length = 80)
    private String upiId;

    @Column(name = "is_active", nullable = false)
    private boolean active = false;

    @Column(nullable = false)
    private int priority = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected PaymentMethod() {
    }

    public PaymentMethod(String label, String upiId, boolean active, int priority) {
        this.label = label;
        this.upiId = upiId;
        this.active = active;
        this.priority = priority;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getLabel() { return label; }
    public String getUpiId() { return upiId; }
    public boolean isActive() { return active; }
    public int getPriority() { return priority; }

    public void setLabel(String label) { this.label = label; }
    public void setUpiId(String upiId) { this.upiId = upiId; }
    public void setActive(boolean active) { this.active = active; }
    public void setPriority(int priority) { this.priority = priority; }
}
