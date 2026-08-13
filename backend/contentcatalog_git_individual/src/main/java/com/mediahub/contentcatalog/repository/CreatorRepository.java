package com.mediahub.contentcatalog.repository;
       
import com.mediahub.contentcatalog.entity.Creator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreatorRepository extends JpaRepository<Creator, Integer> {
}