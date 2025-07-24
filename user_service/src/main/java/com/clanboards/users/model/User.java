package com.clanboards.users.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {
    @Id
    private Long id;
    private String sub;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSub() { return sub; }
    public void setSub(String sub) { this.sub = sub; }
}
