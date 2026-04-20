// ==================== OYUN VERİLERİ (GERÇEK GÖRSELLERLE) ====================
const GAMES = [
    { id: 1, name: "2048", category: "bulmaca", image: "https://images.crazygames.com/games/2048/cover-1585662116897.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/2048", rating: 4.8, plays: "2.3M" },
    { id: 2, name: "Sudoku", category: "bulmaca", image: "https://images.crazygames.com/games/sudoku/cover-1585662106827.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/sudoku", rating: 4.7, plays: "1.8M" },
    { id: 3, name: "Solitaire", category: "kart", image: "https://images.crazygames.com/games/solitaire/cover-1585662116896.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/solitaire", rating: 4.6, plays: "3.2M" },
    { id: 4, name: "Mahjong Connect", category: "bulmaca", image: "https://images.crazygames.com/games/mahjong-connect/cover-1585662116888.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/mahjong-connect", rating: 4.5, plays: "1.2M" },
    { id: 5, name: "Bubble Shooter", category: "bulmaca", image: "https://images.crazygames.com/games/bubble-shooter/cover-1585662116885.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/bubble-shooter", rating: 4.6, plays: "5.1M" },
    { id: 6, name: "Tower Defense", category: "strateji", image: "https://images.crazygames.com/games/tower-defense/cover-1585662116907.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/tower-defense", rating: 4.5, plays: "2.5M" },
    { id: 7, name: "Sniper Shot", category: "aksiyon", image: "https://images.crazygames.com/games/sniper-shot/cover-1585662116905.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/sniper-shot", rating: 4.3, plays: "1.5M" },
    { id: 8, name: "Penalty Kick", category: "spor", image: "https://images.crazygames.com/games/penalty-kick/cover-1585662116893.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/penalty-kick", rating: 4.4, plays: "3.8M" },
    { id: 9, name: "Parking Master", category: "yaris", image: "https://images.crazygames.com/games/parking-master/cover-1585662116891.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/parking-master", rating: 4.2, plays: "2.1M" },
    { id: 10, name: "Fruit Ninja", category: "aksiyon", image: "https://images.crazygames.com/games/fruit-ninja/cover-1585662116892.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/fruit-ninja", rating: 4.7, plays: "8.2M" },
    { id: 11, name: "Subway Surfers", category: "aksiyon", image: "https://images.crazygames.com/games/subway-surfers/cover-1585662116906.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/subway-surfers", rating: 4.8, plays: "15.2M" },
    { id: 12, name: "Helix Jump", category: "aksiyon", image: "https://images.crazygames.com/games/helix-jump/cover-1585662116894.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/helix-jump", rating: 4.4, plays: "6.7M" },
    { id: 13, name: "Water Sort Puzzle", category: "bulmaca", image: "https://images.crazygames.com/games/water-sort-puzzle/cover-1585662116909.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/water-sort-puzzle", rating: 4.5, plays: "3.4M" },
    { id: 14, name: "Paper.io 2", category: "strateji", image: "https://images.crazygames.com/games/paper-io-2/cover-1585662116890.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/paper-io-2", rating: 4.3, plays: "4.2M" },
    { id: 15, name: "Cut the Rope", category: "bulmaca", image: "https://images.crazygames.com/games/cut-the-rope/cover-1585662116888.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/cut-the-rope", rating: 4.7, plays: "9.8M" },
    { id: 16, name: "Idle Miner", category: "strateji", image: "https://images.crazygames.com/games/idle-miner-tycoon/cover-1585662116895.png?auto=format,compress&q=75&cs=strip&ch=DPR&w=120&h=120&fit=crop", embed: "https://www.crazygames.com/embed/idle-miner-tycoon", rating: 4.3, plays: "2.8M" }
];

// Kategoriler
const CATEGORIES = [
    { id: "all", name: "Tümü", icon: "fa-grid-2" },
    { id: "bulmaca", name: "Bulmaca", icon: "fa-puzzle-piece" },
    { id: "aksiyon", name: "Aksiyon", icon: "fa-bolt" },
    { id: "strateji", name: "Strateji", icon: "fa-chess" },
    { id: "spor", name: "Spor", icon: "fa-futbol" },
    { id: "yaris", name: "Yarış", icon: "fa-flag-checkered" },
    { id: "kart", name: "Kart", icon: "fa-club" }
];

// Öne Çıkan Oyunlar
const FEATURED_GAMES = GAMES.slice(0, 4);

// ==================== DEĞİŞKENLER ====================
let userData = {
    name: "Varia",
    username: "varia",
    level: 1,
    xp: 0,
    balance: 0.05,
    totalEarned: 0.05,
    totalGames: 0,
    totalMinutes: 0,
    referralCount: 0,
    referralLink: "https://t.me/VariaGameBot?start=ref_12345",
    friends: [],
    streak: 1,
    lastClaim: null,
    dailyAmount: 0.005,
    settings: {
        notifications: true,
        sound: false,
        vibration: true,
        autoPlay: true
    }
};

let currentPage = "home";
let currentTab = "Tümü";
let weeklyChart, monthlyChart;
let earningInterval = null;
let currentEarning = 0;
let isGameOpen = false;

// ==================== OYUNLARI RENDER ET ====================
function renderGames(filter = "all", search = "") {
    const container = document.getElementById("allGamesList");
    if (!container) return;
    
    let filtered = [...GAMES];
    
    if (filter !== "all") {
        filtered = filtered.filter(g => g.category === filter);
    }
    
    if (search) {
        filtered = filtered.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #8E8E93;">
            <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 10px;"></i>
            <p>Oyun bulunamadı</p>
        </div>`;
        return;
    }
    
    container.innerHTML = filtered.map(game => `
        <div class="game-item" onclick="openGame('${game.embed}', '${game.name}')">
            <img class="game-icon-img" src="${game.image}" alt="${game.name}" onerror="this.src='https://via.placeholder.com/44?text=${game.name.charAt(0)}'">
            <div class="game-content">
                <div class="game-name">${game.name}</div>
                <div class="game-meta">
                    <span><i class="fas fa-star" style="color: #FF9F0A;"></i> ${game.rating}</span>
                    <span style="margin-left: 8px;"><i class="fas fa-play"></i> ${game.plays}</span>
                    <span style="margin-left: 8px;"><i class="fas fa-mobile-alt"></i> Dik</span>
                </div>
            </div>
            <i class="fas fa-play-circle" style="color: #007AFF; font-size: 1.2rem;"></i>
        </div>
    `).join("");
}

function renderFeaturedGames() {
    const container = document.getElementById("featuredGames");
    if (!container) return;
    
    container.innerHTML = FEATURED_GAMES.map(game => `
        <div class="game-card" onclick="openGame('${game.embed}', '${game.name}')">
            <div class="game-icon">
                <img src="${game.image}" alt="${game.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" onerror="this.src='https://via.placeholder.com/100?text=${game.name.charAt(0)}'">
            </div>
            <h4>${game.name}</h4>
            <p><i class="fas fa-star" style="color: #FF9F0A;"></i> ${game.rating}</p>
        </div>
    `).join("");
}

function renderCategories() {
    const container = document.getElementById("tabsContainer");
    if (!container) return;
    
    container.innerHTML = CATEGORIES.map(cat => `
        <button class="tab-item ${currentTab === cat.name ? 'active' : ''}" data-tab="${cat.name}" onclick="switchTab('${cat.name}')">
            <i class="fas ${cat.icon}" style="margin-right: 4px;"></i> ${cat.name}
        </button>
    `).join("");
}

// ==================== OYUN AÇ/KAPAT ====================
function openGame(embedUrl, gameName) {
    const modal = document.getElementById("gameModal");
    const iframe = document.getElementById("gameIframe");
    const title = document.getElementById("modalGameTitle");
    const bottomNav = document.querySelector(".bottom-nav");
    const appHeader = document.querySelector(".apple-header");
    const tgTabs = document.querySelector(".tg-tabs");
    
    isGameOpen = true;
    
    title.textContent = gameName;
    iframe.src = embedUrl;
    modal.style.display = "flex";
    
    // Alt nav ve header'ı gizle
    if (bottomNav) bottomNav.style.display = "none";
    if (appHeader) appHeader.style.display = "none";
    if (tgTabs) tgTabs.style.display = "none";
    
    document.body.style.overflow = "hidden";
    
    // Kazanç başlat
    startEarning();
    
    // Kullanıcı istatistiklerini güncelle
    userData.totalGames++;
    updateUI();
}

function closeGameModal() {
    const modal = document.getElementById("gameModal");
    const iframe = document.getElementById("gameIframe");
    const bottomNav = document.querySelector(".bottom-nav");
    const appHeader = document.querySelector(".apple-header");
    const tgTabs = document.querySelector(".tg-tabs");
    
    isGameOpen = false;
    
    modal.style.display = "none";
    iframe.src = "";
    
    // Alt nav ve header'ı geri göster
    if (bottomNav) bottomNav.style.display = "flex";
    if (appHeader) appHeader.style.display = "block";
    if (tgTabs) tgTabs.style.display = "block";
    
    document.body.style.overflow = "";
    
    // Kazancı durdur
    stopEarning();
}

// ==================== KAZANÇ SİSTEMİ (DÜŞÜK KAZANÇ) ====================
function startEarning() {
    if (earningInterval) clearInterval(earningInterval);
    
    earningInterval = setInterval(() => {
        // Dakikada 0.001 - 0.005 arası kazanç (makul seviye)
        const earningRate = 0.001;
        currentEarning += earningRate;
        
        const banner = document.getElementById("earningBanner");
        const amountSpan = document.getElementById("earningAmount");
        const messageSpan = document.getElementById("earningMessage");
        
        if (banner && amountSpan) {
            if (messageSpan) messageSpan.innerHTML = '<i class="fas fa-coins"></i> Oynuyorsun';
            banner.classList.add("active");
            amountSpan.textContent = `+$${currentEarning.toFixed(4)}`;
            
            setTimeout(() => {
                banner.classList.remove("active");
            }, 2000);
        }
        
        // Bakiye ve XP güncelle
        userData.balance += earningRate;
        userData.totalEarned += earningRate;
        userData.xp += 0.5;
        userData.totalMinutes++;
        
        // Level atlama kontrolü
        const xpNeeded = userData.level * 100;
        if (userData.xp >= xpNeeded) {
            userData.xp -= xpNeeded;
            userData.level++;
        }
        
        updateUI();
        
    }, 60000); // Her dakika
}

function stopEarning() {
    if (earningInterval) {
        clearInterval(earningInterval);
        earningInterval = null;
    }
    currentEarning = 0;
}

// ==================== GÜNLÜK ÖDÜL (DÜŞÜK KAZANÇ) ====================
function claimDaily() {
    const today = new Date().toDateString();
    if (userData.lastClaim === today) {
        alert("Bugün zaten ödülünü aldın! Yarın tekrar dene.");
        return;
    }
    
    // Günlük ödül: 0.005 - 0.05 arası
    let dailyReward = 0.005;
    if (userData.streak >= 7) dailyReward = 0.05;
    else if (userData.streak >= 3) dailyReward = 0.02;
    else if (userData.streak >= 1) dailyReward = 0.01;
    
    userData.balance += dailyReward;
    userData.totalEarned += dailyReward;
    userData.lastClaim = today;
    userData.streak = (userData.streak % 7) + 1;
    userData.dailyAmount = dailyReward;
    
    updateUI();
    renderStreak();
    alert(`🎉 Tebrikler! $${dailyReward.toFixed(4)} kazandın!`);
}

function renderStreak() {
    const container = document.getElementById("streakTracker");
    if (!container) return;
    
    const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    
    container.innerHTML = days.map((day, i) => {
        const dayNum = i + 1;
        let status = "";
        if (dayNum < userData.streak) status = "completed";
        else if (dayNum === userData.streak) status = "current";
        
        return `
            <div class="streak-day ${status}">
                <div class="day-circle">${dayNum}</div>
                <span>${day}</span>
            </div>
        `;
    }).join("");
    
    const dailyAmountEl = document.getElementById("dailyAmount");
    if (dailyAmountEl) dailyAmountEl.textContent = userData.dailyAmount.toFixed(4);
}

// ==================== REFERANS SİSTEMİ ====================
function copyReferralLink() {
    navigator.clipboard.writeText(userData.referralLink);
    alert("Referans linki kopyalandı!");
}

// ==================== FİLTRELEME ====================
function filterGames() {
    const searchInput = document.getElementById("searchInput");
    const searchTerm = searchInput ? searchInput.value : "";
    renderGames(currentTab === "Tümü" ? "all" : currentTab.toLowerCase(), searchTerm);
}

function switchTab(tabName) {
    currentTab = tabName;
    renderCategories();
    
    if (currentPage === "games") {
        renderGames(tabName === "Tümü" ? "all" : tabName.toLowerCase(), "");
    }
}

// ==================== SAYFA GEÇİŞLERİ ====================
function switchPage(page) {
    currentPage = page;
    
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`${page}Page`).classList.add("active");
    
    document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
    document.querySelector(`.nav-item[data-page="${page}"]`).classList.add("active");
    
    const titles = {
        home: "Oyunlar",
        games: "Tüm Oyunlar",
        referral: "Referans",
        profile: "Profil"
    };
    
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = titles[page] || "VARİA";
    
    if (page === "games") {
        renderGames(currentTab === "Tümü" ? "all" : currentTab.toLowerCase(), "");
    } else if (page === "home") {
        renderFeaturedGames();
        renderStreak();
    } else if (page === "referral") {
        renderReferral();
    } else if (page === "profile") {
        renderProfile();
    }
}

function renderReferral() {
    const countEl = document.getElementById("referralCount");
    const progressEl = document.getElementById("referralProgress");
    const friendListEl = document.getElementById("friendList");
    
    if (countEl) countEl.textContent = `${userData.referralCount}/10`;
    if (progressEl) progressEl.style.width = `${(userData.referralCount / 10) * 100}%`;
    
    if (friendListEl) {
        if (userData.friends.length === 0) {
            friendListEl.innerHTML = `<div style="text-align: center; padding: 20px; color: #8E8E93;">
                <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Henüz arkadaşın yok</p>
                <p style="font-size: 0.8rem;">Linkini paylaşarak arkadaşlarını davet et!</p>
            </div>`;
        } else {
            friendListEl.innerHTML = userData.friends.map(f => `
                <div class="friend-item">
                    <div class="friend-info">
                        <div class="friend-avatar">${f.name.charAt(0)}</div>
                        <div><strong>${f.name}</strong><br><small style="color: #8E8E93;">${f.date}</small></div>
                    </div>
                    <div class="friend-earning">+$${f.earned}</div>
                </div>
            `).join("");
        }
    }
}

function renderProfile() {
    const totalEarnedEl = document.getElementById("totalEarned");
    const totalGamesEl = document.getElementById("totalGames");
    const totalMinutesEl = document.getElementById("totalMinutes");
    const profileLevelEl = document.getElementById("profileLevel");
    const profileXpEl = document.getElementById("profileXp");
    const profileNameEl = document.getElementById("profileName");
    const profileIdEl = document.getElementById("profileId");
    
    if (totalEarnedEl) totalEarnedEl.textContent = `$${userData.totalEarned.toFixed(4)}`;
    if (totalGamesEl) totalGamesEl.textContent = userData.totalGames;
    if (totalMinutesEl) totalMinutesEl.textContent = userData.totalMinutes;
    if (profileLevelEl) profileLevelEl.textContent = userData.level;
    if (profileXpEl) profileXpEl.textContent = Math.floor(userData.xp);
    if (profileNameEl) profileNameEl.textContent = userData.name;
    if (profileIdEl) profileIdEl.textContent = `#${Math.floor(Math.random() * 90000) + 10000}`;
}

// ==================== AYARLAR ====================
function toggleSetting(setting) {
    const toggle = document.getElementById(`toggle${setting.charAt(0).toUpperCase() + setting.slice(1)}`);
    userData.settings[setting] = !userData.settings[setting];
    
    if (toggle) {
        if (userData.settings[setting]) {
            toggle.classList.add("active");
        } else {
            toggle.classList.remove("active");
        }
    }
}

// ==================== MODALLAR ====================
function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
}

function openFilterModal() {
    alert("Filtreleme özelliği yakında!");
}

function openStatsModal() {
    alert("Detaylı istatistikler yakında!");
}

function openStreakInfo() {
    alert("🔥 Günlük streak'in ne kadar yüksek olursa, ödüllerin o kadar büyür! Her gün giriş yapmayı unutma!");
}

function openBalanceDetails() {
    alert(`💰 Güncel Bakiye: $${userData.balance.toFixed(4)}\n\nToplam Kazanç: $${userData.totalEarned.toFixed(4)}\n\nOyun oynayarak kazanmaya devam et!`);
}

function openHelpModal() {
    alert("📖 Yardım\n\n- Oyun oynayarak XP ve para kazan (dakikada ~$0.001)\n- Günlük ödüller: $0.005 - $0.05\n- Arkadaşlarını davet et, %10 kazan\n- Dik mod oyunlar telefon için optimize edilmiştir");
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: "VARİA GAME",
            text: "Oyun oynayarak para kazan!",
            url: userData.referralLink
        });
    } else {
        copyReferralLink();
    }
}

function playRecommendedGame() {
    const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
    openGame(randomGame.embed, randomGame.name);
}

// ==================== GRAFİKLER ====================
function initCharts() {
    const weeklyCtx = document.getElementById("weeklyChart")?.getContext("2d");
    const monthlyCtx = document.getElementById("monthlyChart")?.getContext("2d");
    
    if (weeklyCtx) {
        weeklyChart = new Chart(weeklyCtx, {
            type: 'line',
            data: {
                labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
                datasets: [{
                    data: [0.012, 0.019, 0.015, 0.025, 0.022, 0.035, 0.042],
                    borderColor: '#5856D6',
                    backgroundColor: 'rgba(88,86,214,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#5856D6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { ticks: { callback: v => '$' + v.toFixed(3) } } }
            }
        });
    }
    
    if (monthlyCtx) {
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ['1.Hf', '2.Hf', '3.Hf', '4.Hf'],
                datasets: [{
                    data: [0.125, 0.180, 0.210, 0.275],
                    backgroundColor: 'rgba(88,86,214,0.7)',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { ticks: { callback: v => '$' + v.toFixed(3) } } }
            }
        });
    }
}

// ==================== UI GÜNCELLEME ====================
function updateUI() {
    const balanceEl = document.getElementById("balanceDisplay");
    const userLevelEl = document.getElementById("userLevel");
    const currentXpEl = document.getElementById("currentXp");
    const xpToNextEl = document.getElementById("xpToNextLevel");
    const xpFillEl = document.getElementById("xpFill");
    const referralCountEl = document.getElementById("referralCountDisplay");
    const earningRateEl = document.getElementById("earningRate");
    const weeklyTotalEl = document.getElementById("weeklyTotal");
    const weeklyChangeEl = document.getElementById("weeklyChange");
    
    if (balanceEl) balanceEl.textContent = userData.balance.toFixed(4);
    if (userLevelEl) userLevelEl.textContent = userData.level;
    if (currentXpEl) currentXpEl.textContent = Math.floor(userData.xp);
    if (xpToNextEl) xpToNextEl.textContent = userData.level * 100;
    if (xpFillEl) xpFillEl.style.width = `${(userData.xp / (userData.level * 100)) * 100}%`;
    if (referralCountEl) referralCountEl.textContent = userData.referralCount;
    if (earningRateEl) earningRateEl.innerHTML = '<i class="fas fa-clock"></i> $0.001/dk';
    if (weeklyTotalEl) weeklyTotalEl.textContent = `$${userData.totalEarned.toFixed(4)}`;
    if (weeklyChangeEl) weeklyChangeEl.innerHTML = '<i class="fas fa-arrow-up"></i> +5%';
}

// ==================== ONBOARDING ====================
let currentStep = 1;
let userAge = null;
let userGenres = [];
let userFrequency = null;

function nextOnboardingStep(step) {
    document.querySelector(`.onboarding-step[data-step="${currentStep}"]`).classList.remove("active");
    currentStep = step;
    document.querySelector(`.onboarding-step[data-step="${currentStep}"]`).classList.add("active");
    
    document.querySelectorAll(".dot").forEach((dot, i) => {
        dot.classList.remove("active", "completed");
        if (i < currentStep - 1) dot.classList.add("completed");
        else if (i === currentStep - 1) dot.classList.add("active");
    });
}

function completeOnboarding() {
    document.getElementById("onboarding").style.display = "none";
    document.getElementById("mainApp").classList.add("active");
    
    // Telegram WebApp'i başlat
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user) {
            userData.name = user.first_name || user.username || "Varia";
            userData.username = user.username || "varia";
            document.getElementById("userName").textContent = userData.name;
            document.getElementById("userUsername").textContent = `@${userData.username}`;
            document.getElementById("userAvatar").textContent = userData.name.charAt(0);
            document.getElementById("profileAvatar").textContent = userData.name.charAt(0);
            document.getElementById("profileName").textContent = userData.name;
        }
    }
    
    renderCategories();
    renderFeaturedGames();
    renderGames();
    renderStreak();
    initCharts();
    updateUI();
}

// ==================== ONBOARDING SEÇİMLER ====================
document.querySelectorAll("[data-age]").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll("[data-age]").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        userAge = this.dataset.age;
    });
});

document.querySelectorAll("[data-genre]").forEach(btn => {
    btn.addEventListener("click", function() {
        this.classList.toggle("active");
        const genre = this.dataset.genre;
        if (userGenres.includes(genre)) {
            userGenres = userGenres.filter(g => g !== genre);
        } else {
            userGenres.push(genre);
        }
    });
});

document.querySelectorAll("[data-frequency]").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll("[data-frequency]").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        userFrequency = this.dataset.frequency;
    });
});

// ==================== BAŞLANGIÇ ====================
document.addEventListener("DOMContentLoaded", () => {
    renderCategories();
    renderFeaturedGames();
    renderStreak();
    initCharts();
    updateUI();
});
