package com.example.demo.repository;

import com.example.demo.entity.AngerButtonUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AngerButtonUserRepository extends JpaRepository<AngerButtonUser, Long> {

    @Query("""
            select u.username as username, a.label as label
            from AngerButtonUser a, User u
            where u.id = a.userId
            order by u.username
            """)
    List<NamedLabel> listNamed();

    interface NamedLabel {
        String getUsername();
        String getLabel();
    }
}
