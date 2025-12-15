<?php
// Simple login page that serves HTML
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pharmacy Management System - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <style>
        .bg-pattern {
            background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
            opacity: 0.05;
            mix-blend-mode: soft-light;
        }
    </style>
</head>
<body class="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Background Decoration -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div class="absolute -top-1/2 -left-1/4 w-[1000px] h-[1000px] bg-teal-900/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-1/2 -right-1/4 w-[1000px] h-[1000px] bg-blue-900/20 rounded-full blur-3xl"></div>
    </div>

    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[500px] flex overflow-hidden z-10">

        <!-- Left Side - Hero / Branding -->
        <div class="hidden md:flex w-1/2 bg-gradient-to-br from-teal-800 to-slate-900 p-6 flex-col justify-between text-white relative">
            <div class="relative z-10">
                <div class="inline-flex items-center gap-3 mb-6">
                    <div class="p-3 bg-teal-500/20 rounded-xl backdrop-blur-sm border border-teal-500/30">
                        <i data-lucide="shield" class="w-8 h-8 text-teal-400"></i>
                    </div>
                    <h1 class="text-3xl font-bold tracking-tight">PMS<span class="text-teal-400">.</span></h1>
                </div>
                <h2 class="text-3xl font-bold leading-tight mb-4">
                    <span class="text-teal-400">Pharmacy</span> <br />
                    Management System.
                </h2>
                <p class="text-slate-300 text-base leading-relaxed mb-4">
                    Secure, scalable, and intelligent system for multi-branch operations.
                </p>
            </div>

            <div class="relative z-10 space-y-3">
                <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                        KH
                    </div>
                    <div>
                        <p class="font-bold text-sm">Developed by Kachehub</p>
                        <p class="text-xs text-slate-400">Kachehubinfo@gmail.com</p>
                    </div>
                </div>
                <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                        HO
                    </div>
                    <div>
                        <p class="font-bold text-sm">Centralized Control</p>
                        <p class="text-xs text-slate-400">Head Office Dashboard</p>
                    </div>
                </div>
            </div>

            <!-- Decorative Grid -->
            <div class="absolute inset-0 bg-pattern"></div>
        </div>

        <!-- Right Side - Login Form -->
        <div class="w-full md:w-1/2 p-6 flex flex-col justify-center bg-white">
            <div class="max-w-sm mx-auto w-full">
                <h2 class="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                <p class="text-slate-500 mb-6">Sign in to access your pharmacy dashboard.</p>

                <form id="loginForm" class="space-y-4">
                    <!-- Username Input -->
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Username</label>
                        <div class="relative group">
                            <i data-lucide="user" class="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors"></i>
                            <input
                                type="text"
                                id="username"
                                class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium placeholder-slate-400"
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                    </div>

                    <!-- Password Input -->
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">Password</label>
                        <div class="relative group">
                            <i data-lucide="lock" class="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors"></i>
                            <input
                                type="password"
                                id="password"
                                class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium placeholder-slate-400"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <!-- Error Message -->
                    <div id="errorMessage" class="hidden p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-medium">
                        <i data-lucide="alert-triangle" class="w-5 h-5 shrink-0"></i>
                        <span id="errorText"></span>
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        id="submitBtn"
                        class="w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                    >
                        <span>Sign In</span>
                        <i data-lucide="arrow-right" class="w-5 h-5"></i>
                    </button>
                </form>

            </div>
        </div>

    </div>

    <script>
        // Initialize Lucide icons
        lucide.createIcons();

        const form = document.getElementById('loginForm');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const submitBtn = document.getElementById('submitBtn');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (!username || !password) {
                showError('Please enter both username and password.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Signing In...';
            lucide.createIcons();

            try {
                const response = await fetch('index.php/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Success - store token and user, redirect
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '../'; // Redirect to frontend
                } else {
                    showError(data.error || 'Login failed');
                }
            } catch (error) {
                showError('Network error. Please check your connection.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Sign In</span><i data-lucide="arrow-right" class="w-5 h-5"></i>';
                lucide.createIcons();
            }
        });

        function showError(message) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
        }

        // Hide error on input
        usernameInput.addEventListener('input', () => errorMessage.classList.add('hidden'));
        passwordInput.addEventListener('input', () => errorMessage.classList.add('hidden'));
    </script>
</body>
</html>