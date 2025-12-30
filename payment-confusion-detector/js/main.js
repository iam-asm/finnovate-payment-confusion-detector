let totalAmount = 299.00;
let currentFee = 49.00;
let couponDiscount = 0;
let isTrackingEnabled = false;
let isMagnifierEnabled = false;
let magnifiedWords = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('consentModal')) {
        initConsentPage();
    } else {
        initPaymentGateway();
    }
});

/* =========================================================
   CONSENT PAGE LOGIC
   ========================================================= */

function initConsentPage() {
    const enableBtn = document.getElementById('enableTracking');
    const checkbox = document.getElementById('consentCheckbox');
    const skipBtn = document.getElementById('skipTracking');
    
    // Enable button only when checkbox is checked
    checkbox.addEventListener('change', () => {
        enableBtn.disabled = !checkbox.checked;
    });
    
    // Consent granted → Store and redirect with tracking=on
    enableBtn.addEventListener('click', () => {
        localStorage.setItem('eyeConsent', 'granted');
        window.location.href = 'payment-gateway.html?tracking=on';
    });
    
    // Skip tracking → Redirect without activation
    skipBtn.addEventListener('click', () => {
        localStorage.setItem('eyeConsent', 'denied');
        window.location.href = 'payment-gateway.html?tracking=off';
    });
}

/* =========================================================
   PAYMENT GATEWAY LOGIC
   ========================================================= */

function initPaymentGateway() {
    // Check consent status
    const consentGranted = localStorage.getItem('eyeConsent') === 'granted';
    const urlParams = new URLSearchParams(window.location.search);
    const trackingParam = urlParams.get('tracking') === 'on';
    
    isTrackingEnabled = consentGranted || trackingParam;
    
    updateTrackingUI(isTrackingEnabled);
    createMagnifierToggle();
    initPaymentTabs();
    initFeatures();
}

/* =========================================================
   TRACKING STATUS UI
   ========================================================= */

function updateTrackingUI(enabled) {
    const eyeIndicator = document.getElementById('eyeIndicator');
    const trackingText = document.getElementById('trackingText');
    const trackingStatus = document.getElementById('trackingStatus');
    
    if (!eyeIndicator || !trackingText) return;
    
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
    
    // Toggle click handler
    if (trackingStatus) {
        trackingStatus.onclick = () => {
            const newState = !isTrackingEnabled;
            
            if (newState) {
                // Activate Eye Guardian
                if (typeof window.activateEyeGuardian === 'function') {
                    window.activateEyeGuardian();
                    isTrackingEnabled = true;
                    updateTrackingUI(true);
                } else {
                    console.error('Backend not loaded');
                }
            } else {
                // Pause tracking
                isTrackingEnabled = false;
                updateTrackingUI(false);
                
                // Dispatch pause event to backend
                window.dispatchEvent(new CustomEvent('eyeGuardianToggle', {
                    detail: { enabled: false }
                }));
            }
        };
    }
}

/* =========================================================
   MAGNIFIER TOGGLE
   ========================================================= */

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
            const magnifier = document.getElementById('magnifier');
            if (magnifier) magnifier.style.display = 'none';
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

/* =========================================================
   MAGNIFIER LOGIC
   ========================================================= */

document.addEventListener('mousemove', (e) => {
    if (!isMagnifierEnabled) return;
    
    let magnifier = document.getElementById('magnifier');
    if (!magnifier) {
        magnifier = document.createElement('div');
        magnifier.id = 'magnifier';
        magnifier.className = 'magnifier';
        document.body.appendChild(magnifier);
    }
    
    magnifier.style.left = (e.clientX - 40) + 'px';
    magnifier.style.top = (e.clientY - 40) + 'px';
    magnifier.style.display = 'block';
    magnifyNearestWord(e);
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

/* =========================================================
   PAYMENT TABS
   ========================================================= */

function initPaymentTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            const tabContent = document.getElementById(tabId);
            if (tabContent) tabContent.classList.add('active');
        });
    });
}

/* =========================================================
   TAX POPUP
   ========================================================= */

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
    const closeBtn = overlay.querySelector('.tax-popup-close');
    if (closeBtn) {
        closeBtn.onclick = () => overlay.style.display = 'none';
    }
}

/* =========================================================
   PAYMENT FEATURES
   ========================================================= */

function initFeatures() {
    const taxInfoBtn = document.getElementById('taxInfoBtn');
    if (taxInfoBtn) {
        taxInfoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showTaxPopup();
        });
    }
    
    const applyCouponBtn = document.getElementById('applyCoupon');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', () => {
            const codeInput = document.getElementById('couponCode');
            const messageEl = document.getElementById('couponMessage');
            
            if (!codeInput || !messageEl) return;
            
            const code = codeInput.value.toUpperCase();
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
    }
    
    const premiumUpgrade = document.getElementById('premiumUpgrade');
    if (premiumUpgrade) {
        premiumUpgrade.addEventListener('change', (e) => {
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
}

function updateTotal() {
    const newTotal = totalAmount + currentFee - couponDiscount;
    
    const totalAmountEl = document.getElementById('totalAmount');
    const feeAmountEl = document.getElementById('feeAmount');
    const payAmountEl = document.getElementById('payAmount');
    const payButton = document.querySelector('.pay-button');
    
    if (totalAmountEl) totalAmountEl.textContent = `₹${newTotal.toFixed(2)}`;
    if (feeAmountEl) feeAmountEl.textContent = `₹${currentFee.toFixed(2)}`;
    if (payAmountEl) payAmountEl.textContent = `₹${newTotal.toFixed(2)}`;
    if (payButton) payButton.textContent = `Secure Vault Transaction ₹${newTotal.toFixed(2)}`;
}