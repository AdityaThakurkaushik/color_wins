
// package com.example.demo.repository;

// import com.example.demo.entity.User;
// import jakarta.persistence.LockModeType;
// import org.springframework.data.jpa.repository.JpaRepository;
// import org.springframework.data.jpa.repository.Lock;
// import org.springframework.data.repository.query.Param;
// import org.springframework.data.jpa.repository.Query;

// import java.util.Optional;

// public interface UserRepository extends JpaRepository<User, Long> {

//     Optional<User> findByUsername(String username);

//     Optional<User> findByEmail(String email);

//     Optional<User> findByMobileNumber(String mobileNumber);

//     Optional<User> findByReferralCode(String referralCode);

//     @Lock(LockModeType.PESSIMISTIC_WRITE)
//     @Query("SELECT u FROM User u WHERE u.id = :userId")
//     Optional<User> findByIdForUpdate(@Param("userId") Long userId);
//     long countByReferredByCode(String referredByCode);
// }



package com.example.demo.repository;

import com.example.demo.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByMobileNumber(String mobileNumber);

    Optional<User> findByReferralCode(String referralCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :userId")
    Optional<User> findByIdForUpdate(@Param("userId") Long userId);

    long countByReferredByCode(String referredByCode);

    @Query("""
        SELECT u FROM User u
        WHERE (
            :search IS NULL OR :search = ''
            OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
        )
    """)
    Page<User> searchUsers(
        @Param("search") String search,
        Pageable pageable
    );
}
