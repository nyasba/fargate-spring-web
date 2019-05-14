package com.nyasba.fargatesample.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SampleController {

    @RequestMapping("/")
    @GetMapping
    public String hello(Model model) {
        model.addAttribute("name", "テスト");
        return "sample";
    }

}
