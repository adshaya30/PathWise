package com.pathwise.authentication.service.impl;

import com.pathwise.authentication.entity.OtpType;
import com.pathwise.authentication.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.Year;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String mailFrom;

    @Override
    @Async
    public void sendOtpEmail(String toEmail, String otp, OtpType type) {
        String subject = type == OtpType.EMAIL_VERIFICATION
                ? "PathWise — Your Verification Code: " + otp
                : "PathWise — Password Reset Code: " + otp;

        String actionTitle = type == OtpType.EMAIL_VERIFICATION
                ? "Verify Your Email Address"
                : "Reset Your Password";

        String actionDescription = type == OtpType.EMAIL_VERIFICATION
                ? "Thank you for joining PathWise. Please use the 6-digit verification code below to verify your email address and activate your account."
                : "We received a request to reset your PathWise account password. Please use the 6-digit verification code below to proceed.";

        // Set Thymeleaf Context variables
        Context context = new Context();
        context.setVariable("subject", subject);
        context.setVariable("title", actionTitle);
        context.setVariable("description", actionDescription);
        context.setVariable("otp", otp);
        context.setVariable("year", Year.now().getValue());

        // Process Thymeleaf Template from resources/templates/otp-email.html
        String htmlContent = templateEngine.process("otp-email", context);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom, "PathWise Support");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("✅ Successfully dispatched Thymeleaf OTP email to [{}] via Gmail SMTP", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("❌ Failed to send email via SMTP to [{}]. Error: {}", toEmail, e.getMessage());
            // Fallback console log for development debugging
            log.info("=================================================");
            log.info("📧 [LOCAL BACKUP - EMAIL OTP]");
            log.info("TO:      {}", toEmail);
            log.info("OTP:     >>> {} <<<", otp);
            log.info("=================================================");
        }
    }
}
