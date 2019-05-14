package com.nyasba.fargatesample.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthCheckController {

    @RequestMapping("/healthcheck")
    @GetMapping
    public String healthcheck() {
        return "ok";
    }

}
