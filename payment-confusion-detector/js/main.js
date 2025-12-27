let totalAmount = 299.00;
let currentFee = 49.00;
let couponDiscount = 0;
let isTrackingEnabled = false;
let isMagnifierEnabled = false;
let confusionZones = {};  // 🔥 CONFUSION DETECTION STORAGE
let magnifiedWords = [];
let lastConfusionCheck = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('consentModal')) {
        initConsentPage();
    } else {
        initPaymentGateway();
    }
});

function initConsentPage() {
    const enableBtn = document.getElementById('enableTracking');
    const checkbox = document.getElementById('consentCheckbox');
    const skipBtn = document.getElementById('skipTracking');
    
    checkbox.addEventListener('change', () => enableBtn.disabled = !checkbox.checked);
    
    enableBtn.addEventListener('click', () => {
        localStorage.setItem('eyeConsent', 'granted');
        window.location.href = 'payment-gateway.html?tracking=on';
    });
    
    skipBtn.addEventListener('click', () => {
        window.location.href = 'payment-gateway.html?tracking=off';
    });
}

function initPaymentGateway() {
    const trackingEnabled = localStorage.getItem('eyeConsent') === 'granted' || 
                           new URLSearchParams(window.location.search).get('tracking') === 'on';
    
    if (trackingEnabled) isTrackingEnabled = true;
    
    updateTrackingUI(isTrackingEnabled);
    createMagnifierToggle();
    initPaymentTabs();
    initFeatures();
}

function updateTrackingUI(enabled) {
    const eyeIndicator = document.getElementById('eyeIndicator');
    const trackingText = document.getElementById('trackingText');
    const trackingStatus = document.getElementById('trackingStatus');
    
    if (enabled) {
        eyeIndicator.classList.remove('off');
        eyeIndicator.classList.add('on');
        trackingText.textContent = 'Eye Assist ON';
    } else {
        eyeIndicator.classList.add('off');
        eyeIndicator.classList.remove('on');
        trackingText.textContent = 'Eye Assist OFF';
    }
    isTrackingEnabled = enabled;
    
    trackingStatus.onclick = () => {
        isTrackingEnabled = !isTrackingEnabled;
        updateTrackingUI(isTrackingEnabled);
    };
}

function createMagnifierToggle() {
    const toggle = document.createElement('div');
    toggle.id = 'magnifierToggle';
    toggle.className = 'magnifier-toggle';
    toggle.innerHTML = '🔍';
    toggle.title = 'Word Magnifier';
    document.body.appendChild(toggle);
    
    toggle.onclick = (e) => {
        e.stopPropagation();
        isMagnifierEnabled = !isMagnifierEnabled;
        toggle.classList.toggle('active');
        document.body.classList.toggle('magnifier-active', isMagnifierEnabled);
        
        if (!isMagnifierEnabled) {
            clearAllMagnifiedWords();
            document.getElementById('magnifier').style.display = 'none';
        }
    };
}

function clearAllMagnifiedWords() {
    magnifiedWords.forEach(span => {
        if (span.parentNode) {
            const word = span.textContent;
            span.parentNode.replaceChild(document.createTextNode(word), span);
        }
    });
    magnifiedWords = [];
}

// 🔥 MAIN MOUSE TRACKER WITH CONFUSION DETECTION
document.addEventListener('mousemove', (e) => {
    if (!isTrackingEnabled) return;
    
    const now = Date.now();
    
    // 🔥 MAGNIFIER
    if (isMagnifierEnabled) {
        const magnifier = document.getElementById('magnifier');
        magnifier.style.left = (e.clientX - 40) + 'px';
        magnifier.style.top = (e.clientY - 40) + 'px';
        magnifier.style.display = 'block';
        magnifyNearestWord(e);
    }
    
    // 🔥 CONFUSION DETECTION - CHECK EVERY 100ms
    if (now - lastConfusionCheck > 100) {
        checkConfusionZones(e);
        lastConfusionCheck = now;
    }
});

function magnifyNearestWord(e) {
    clearAllMagnifiedWords();
    
    const allTextElements = document.querySelectorAll('p, span, label, small, strong, div, .terms-conditions');
    
    allTextElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || 
            e.clientY < rect.top || e.clientY > rect.bottom) return;
        
        const text = element.innerText || element.textContent || '';
        const words = text.split(/\s+/);
        
        let closestDistance = Infinity;
        let closestWordIndex = -1;
        
        words.forEach((word, index) => {
            if (word.length === 0) return;
            
            const tempSpan = document.createElement('span');
            tempSpan.textContent = word;
            element.appendChild(tempSpan);
            
            const wordRect = tempSpan.getBoundingClientRect();
            element.removeChild(tempSpan);
            
            const distance = Math.hypot(
                e.clientX - (wordRect.left + wordRect.width / 2),
                e.clientY - (wordRect.top + wordRect.height / 2)
            );
            
            if (distance < closestDistance && distance < 25) {
                closestDistance = distance;
                closestWordIndex = index;
            }
        });
        
        if (closestWordIndex !== -1) {
            const word = words[closestWordIndex];
            createMagnifiedWord(element, word, closestWordIndex);
            return;
        }
    });
}

function createMagnifiedWord(container, word, wordIndex) {
    const words = container.innerText.split(/\s+/);
    words[wordIndex] = `<span class="magnify-word">${word}</span>`;
    container.innerHTML = words.join(' ');
    
    const span = container.querySelector('.magnify-word');
    if (span) magnifiedWords.push(span);
}

// 🔥 🔥 CONFUSION DETECTION - YELLOW HIGHLIGHT 🔥 🔥
function checkConfusionZones(e) {
    document.querySelectorAll('.confusion-zone').forEach(zone => {
        const rect = zone.getBoundingClientRect();
        const isInZone = e.clientX >= rect.left && e.clientX <= rect.right && 
                        e.clientY >= rect.top && e.clientY <= rect.bottom;
        
        const zoneId = zone.id;
        
        if (isInZone) {
            // Initialize zone tracking
            if (!confusionZones[zoneId]) {
                confusionZones[zoneId] = { 
                    dwell: 0, 
                    visits: 0, 
                    lastVisit: 0 
                };
            }
            
            const zoneData = confusionZones[zoneId];
            
            // Count dwell time (~60fps = 16ms per frame)
            zoneData.dwell += 16;
            
            // Count visits (new visit after 500ms away)
            if (Date.now() - zoneData.lastVisit > 500) {
                zoneData.visits++;
                zoneData.lastVisit = Date.now();
            }
            
            console.log(`Zone ${zoneId}: ${Math.round(zoneData.dwell/1000)}s dwell, ${zoneData.visits} visits`);
            
            // 🔥 TRIGGER CONFUSION - 5s dwell AND 3+ visits
            if (zoneData.dwell > 5000 && zoneData.visits >= 3) {
                // TO BE REPLACED BY PARTNER'S WebGazeJS
                window.triggerHelp(zoneId, zoneData.dwell);
            }
        }
    });
}

window.triggerHelp = function(zoneId, dwellTime) {
    console.log('🧙‍♂️ CONFUSION DETECTED:', zoneId, `${dwellTime/1000}s dwell`);
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    
    // 🔥 YELLOW HIGHLIGHT ANIMATION
    zone.classList.add('confused');
    setTimeout(() => zone.classList.remove('confused'), 4000);
    
    // Specific actions
    if (zoneId === 'feeSummary') {
        showTaxPopup();
    } else if (zoneId === 'premiumCheckbox') {
        zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (zoneId === 'termsZone') {
        zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Show chat after sustained confusion
    setTimeout(() => {
        const chatBubble = document.getElementById('chatBubble');
        if (chatBubble) chatBubble.style.display = 'block';
    }, 15000);
};

function initPaymentTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
}

function showTaxPopup() {
    let overlay = document.getElementById('taxPopupOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'taxPopupOverlay';
        overlay.className = 'tax-popup-overlay';
        overlay.innerHTML = `
            <div class="tax-popup">
                <button class="tax-popup-close">&times;</button>
                <h4>Goblin Fee Breakdown</h4>
                <div class="tax-item"><span>Vault Security</span><span>₹12.00</span></div>
                <div class="tax-item"><span>Goblin Processing</span><span>₹15.00</span></div>
                <div class="tax-item"><span>Magical Compliance</span><span>₹8.00</span></div>
                <div class="tax-item"><span>Dragon Insurance</span><span>₹14.00</span></div>
                <div class="tax-total"><span>Total Fees</span><span>₹${currentFee.toFixed(2)}</span></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
    };
    overlay.querySelector('.tax-popup-close').onclick = () => {
        overlay.style.display = 'none';
    };
}

function initFeatures() {
    document.getElementById('taxInfoBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        showTaxPopup();
    });
    
    document.getElementById('applyCoupon').addEventListener('click', () => {
        const code = document.getElementById('couponCode').value.toUpperCase();
        const messageEl = document.getElementById('couponMessage');
        const coupons = { 
            'HARRY100': 100, 
            'BELLATRIX200': 200, 
            'GRINGOTTS50': 50, 
            'WIZARDING20': 20, 
            'GOBLIN10': 10 
        };
        
        if (coupons[code]) {
            couponDiscount = coupons[code];
            messageEl.textContent = `${code}: ₹${couponDiscount} OFF!`;
            messageEl.className = 'coupon-message success';
        } else {
            messageEl.textContent = 'Invalid code...';
            messageEl.className = 'coupon-message error';
            setTimeout(() => messageEl.textContent = '', 3000);
            return;
        }
        updateTotal();
    });
    
    document.getElementById('premiumUpgrade').addEventListener('change', (e) => {
        if (e.target.checked) {
            totalAmount += 5;
            currentFee += 5;
        } else {
            totalAmount -= 5;
            currentFee -= 5;
        }
        updateTotal();
    });
}

function updateTotal() {
    const newTotal = totalAmount + currentFee - couponDiscount;
    document.getElementById('totalAmount').textContent = `₹${newTotal.toFixed(2)}`;
    document.getElementById('feeAmount').textContent = `₹${currentFee.toFixed(2)}`;
    document.getElementById('payAmount').textContent = `₹${newTotal.toFixed(2)}`;
    document.querySelector('.pay-button').textContent = `Secure Vault Transaction ₹${newTotal.toFixed(2)}`;
}
