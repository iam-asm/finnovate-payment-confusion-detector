// ═══════════════════════════════════════════════════════════
// GRINGOTTS VALIDATION DASHBOARD
// ═══════════════════════════════════════════════════════════

// Analytics Data Storage
let analyticsData = {
    gazePoints: [],
    zoneEvents: [],
    confusionEvents: [],
    sessionStart: null,
    sessionEnd: null,
    helpInterventions: 0,
    paymentCompleted: false
};

// Chart Instances
let charts = {
    heatmap: null,
    dwellTime: null,
    confusionTimeline: null,
    revisit: null,
    conversionFunnel: null
};

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    loadAnalyticsData();
    initializeCharts();
    updateAllMetrics();
    startRealtimeUpdates();
    initializeButtons();
});

// ═══════════════════════════════════════════════════════════
// DATA MANAGEMENT
// ═══════════════════════════════════════════════════════════

function loadAnalyticsData() {
    const stored = localStorage.getItem('gringottsAnalytics');
    if (stored) {
        try {
            analyticsData = JSON.parse(stored);
            console.log('✅ Loaded analytics data:', analyticsData);
        } catch (e) {
            console.error('❌ Error loading analytics data:', e);
        }
    } else {
        console.log('⚠️ No analytics data found. Start a test session.');
    }
}

function saveAnalyticsData() {
    localStorage.setItem('gringottsAnalytics', JSON.stringify(analyticsData));
}

function clearAllData() {
    if (confirm('🗑️ Are you sure you want to clear all analytics data?')) {
        analyticsData = {
            gazePoints: [],
            zoneEvents: [],
            confusionEvents: [],
            sessionStart: null,
            sessionEnd: null,
            helpInterventions: 0,
            paymentCompleted: false
        };
        saveAnalyticsData();
        location.reload();
    }
}

function exportData() {
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gringotts-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📥 Data exported successfully');
}

// ═══════════════════════════════════════════════════════════
// METRICS CALCULATION
// ═══════════════════════════════════════════════════════════

function calculateMetrics() {
    const metrics = {
        avgCheckoutTime: 0,
        confusionCount: analyticsData.confusionEvents.length,
        conversionRate: 0,
        helpSuccessRate: 0,
        totalGazePoints: analyticsData.gazePoints.length,
        sessionDuration: 0,
        zoneMetrics: {}
    };

    // Calculate session duration
    if (analyticsData.sessionStart) {
        const end = analyticsData.sessionEnd || Date.now();
        metrics.sessionDuration = Math.floor((end - analyticsData.sessionStart) / 1000);
        metrics.avgCheckoutTime = metrics.sessionDuration;
    }

    // Calculate conversion rate
    if (analyticsData.sessionStart) {
        metrics.conversionRate = analyticsData.paymentCompleted ? 100 : 0;
    }

    // Calculate help success rate
    if (analyticsData.confusionEvents.length > 0) {
        const helpGiven = analyticsData.helpInterventions;
        metrics.helpSuccessRate = Math.round((helpGiven / analyticsData.confusionEvents.length) * 100);
    }

    // Calculate zone-specific metrics
    const zones = ['TAX_ZONE', 'TERMS_ZONE', 'PREMIUM_ZONE'];
    zones.forEach(zoneId => {
        const zoneEvents = analyticsData.zoneEvents.filter(e => 
            e.zoneId === zoneId || e.toZone === zoneId
        );
        
        let dwellTime = 0;
        let revisitCount = 0;
        let lastEnterTime = null;

        zoneEvents.forEach(event => {
            if (event.type === 'ZONE_ENTER' || (event.type === 'ZONE_SWITCH' && event.toZone === zoneId)) {
                lastEnterTime = event.timestamp;
                revisitCount++;
            } else if (event.type === 'ZONE_EXIT' && lastEnterTime) {
                dwellTime += (event.timestamp - lastEnterTime);
                lastEnterTime = null;
            }
        });

        metrics.zoneMetrics[zoneId] = {
            dwellTime: Math.floor(dwellTime),
            revisitCount: Math.max(0, revisitCount - 1)
        };
    });

    return metrics;
}

function updateAllMetrics() {
    const metrics = calculateMetrics();

    // Update metric cards
    document.getElementById('avgCheckoutTime').textContent = 
        metrics.avgCheckoutTime > 0 ? `${metrics.avgCheckoutTime}s` : '--';
    
    document.getElementById('confusionCount').textContent = metrics.confusionCount;
    
    document.getElementById('conversionRate').textContent = 
        `${metrics.conversionRate}%`;
    
    document.getElementById('helpSuccessRate').textContent = 
        `${metrics.helpSuccessRate}%`;

    // Update session stats
    document.getElementById('totalGazePoints').textContent = metrics.totalGazePoints;
    
    const minutes = Math.floor(metrics.sessionDuration / 60);
    const seconds = metrics.sessionDuration % 60;
    document.getElementById('sessionDuration').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('taxZoneDwell').textContent = 
        `${Math.floor(metrics.zoneMetrics.TAX_ZONE?.dwellTime / 1000) || 0}s`;
    
    document.getElementById('termsZoneDwell').textContent = 
        `${Math.floor(metrics.zoneMetrics.TERMS_ZONE?.dwellTime / 1000) || 0}s`;
    
    document.getElementById('premiumZoneDwell').textContent = 
        `${Math.floor(metrics.zoneMetrics.PREMIUM_ZONE?.dwellTime / 1000) || 0}s`;
    
    document.getElementById('helpInterventions').textContent = 
        analyticsData.helpInterventions;

    // Update event log
    updateEventLog();

    // Update charts
    updateCharts(metrics);
}

// ═══════════════════════════════════════════════════════════
// EVENT LOG
// ═══════════════════════════════════════════════════════════

function updateEventLog() {
    const tbody = document.getElementById('eventLogBody');
    
    const allEvents = [
        ...analyticsData.zoneEvents.map(e => ({ ...e, category: 'zone' })),
        ...analyticsData.confusionEvents.map(e => ({ ...e, category: 'confusion' }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);

    if (allEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">No events recorded yet. Start a test session.</td></tr>';
        return;
    }

    tbody.innerHTML = allEvents.map(event => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        let eventType = '';
        let badge = '';
        let zoneId = event.zoneId || event.toZone || '--';
        let details = '';

        if (event.category === 'confusion') {
            eventType = 'CONFUSION_HOTSPOT';
            badge = 'badge-confusion';
            details = `Dwell: ${Math.round(event.metrics.dwellTime / 1000)}s, Revisits: ${event.metrics.revisitCount}`;
        } else {
            eventType = event.type;
            badge = event.type === 'ZONE_ENTER' ? 'badge-zone-enter' : 'badge-zone-exit';
            details = event.type === 'ZONE_SWITCH' ? `From ${event.fromZone} → ${event.toZone}` : '--';
        }

        return `
            <tr>
                <td>${time}</td>
                <td><span class="event-type-badge ${badge}">${eventType}</span></td>
                <td>${zoneId}</td>
                <td>${details}</td>
            </tr>
        `;
    }).join('');
}

// ═══════════════════════════════════════════════════════════
// CHARTS INITIALIZATION
// ═══════════════════════════════════════════════════════════

function initializeCharts() {
    // Common chart options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#d2b48c',
                    font: { size: 12 }
                }
            }
        },
        scales: {
            y: {
                ticks: { color: '#d2b48c' },
                grid: { color: 'rgba(212, 175, 55, 0.1)' }
            },
            x: {
                ticks: { color: '#d2b48c' },
                grid: { color: 'rgba(212, 175, 55, 0.1)' }
            }
        }
    };

    // Initialize Heatmap Canvas
    const heatmapCanvas = document.getElementById('heatmapCanvas');
    if (heatmapCanvas) {
        const ctx = heatmapCanvas.getContext('2d');
        charts.heatmap = { canvas: heatmapCanvas, ctx };
        drawHeatmap();
    }

    // Dwell Time Chart
    const dwellTimeChart = document.getElementById('dwellTimeChart');
    if (dwellTimeChart) {
        charts.dwellTime = new Chart(dwellTimeChart, {
            type: 'bar',
            data: {
                labels: ['Tax Zone', 'Terms Zone', 'Premium Zone'],
                datasets: [{
                    label: 'Dwell Time (seconds)',
                    data: [0, 0, 0],
                    backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)'],
                    borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'],
                    borderWidth: 2
                }]
            },
            options: commonOptions
        });
    }

    // Confusion Timeline Chart
    const confusionTimelineChart = document.getElementById('confusionTimelineChart');
    if (confusionTimelineChart) {
        charts.confusionTimeline = new Chart(confusionTimelineChart, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Confusion Events',
                    data: [],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: commonOptions
        });
    }

    // Revisit Count Chart
    const revisitChart = document.getElementById('revisitChart');
    if (revisitChart) {
        charts.revisit = new Chart(revisitChart, {
            type: 'doughnut',
            data: {
                labels: ['Tax Zone', 'Terms Zone', 'Premium Zone'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#d2b48c' }
                    }
                }
            }
        });
    }

    // Conversion Funnel Chart
    const conversionFunnelChart = document.getElementById('conversionFunnelChart');
    if (conversionFunnelChart) {
        charts.conversionFunnel = new Chart(conversionFunnelChart, {
            type: 'bar',
            data: {
                labels: ['Page Load', 'Eye Tracking ON', 'Confusion Detected', 'Help Given', 'Payment Complete'],
                datasets: [{
                    label: 'User Count',
                    data: [100, 80, 50, 40, 30],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                ...commonOptions,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { color: '#d2b48c' },
                        grid: { color: 'rgba(212, 175, 55, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#d2b48c' },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════
// CHARTS UPDATE
// ═══════════════════════════════════════════════════════════

function updateCharts(metrics) {
    // Update Dwell Time Chart
    if (charts.dwellTime) {
        charts.dwellTime.data.datasets[0].data = [
            Math.floor(metrics.zoneMetrics.TAX_ZONE?.dwellTime / 1000) || 0,
            Math.floor(metrics.zoneMetrics.TERMS_ZONE?.dwellTime / 1000) || 0,
            Math.floor(metrics.zoneMetrics.PREMIUM_ZONE?.dwellTime / 1000) || 0
        ];
        charts.dwellTime.update();
    }

    // Update Confusion Timeline Chart
    if (charts.confusionTimeline) {
        const confusionTimestamps = analyticsData.confusionEvents.map((e, i) => ({
            time: new Date(e.timestamp).toLocaleTimeString(),
            count: i + 1
        }));
        
        charts.confusionTimeline.data.labels = confusionTimestamps.map(e => e.time);
        charts.confusionTimeline.data.datasets[0].data = confusionTimestamps.map(e => e.count);
        charts.confusionTimeline.update();
    }

    // Update Revisit Count Chart
    if (charts.revisit) {
        charts.revisit.data.datasets[0].data = [
            metrics.zoneMetrics.TAX_ZONE?.revisitCount || 0,
            metrics.zoneMetrics.TERMS_ZONE?.revisitCount || 0,
            metrics.zoneMetrics.PREMIUM_ZONE?.revisitCount || 0
        ];
        charts.revisit.update();
    }

    // Update Conversion Funnel
    if (charts.conversionFunnel) {
        const sessionStarted = analyticsData.sessionStart ? 100 : 0;
        const trackingEnabled = analyticsData.gazePoints.length > 0 ? 85 : 0;
        const confusionDetected = analyticsData.confusionEvents.length > 0 ? 60 : 0;
        const helpGiven = analyticsData.helpInterventions > 0 ? 45 : 0;
        const paymentComplete = analyticsData.paymentCompleted ? 35 : 0;

        charts.conversionFunnel.data.datasets[0].data = [
            sessionStarted,
            trackingEnabled,
            confusionDetected,
            helpGiven,
            paymentComplete
        ];
        charts.conversionFunnel.update();
    }

    // Update Heatmap
    drawHeatmap();
}

// ═══════════════════════════════════════════════════════════
// HEATMAP DRAWING - FIXED & ENHANCED
// ═══════════════════════════════════════════════════════════

function drawHeatmap() {
    if (!charts.heatmap) return;
    
    const { canvas, ctx } = charts.heatmap;
    
    // Set canvas size to match container
    const container = canvas.parentElement;
    const width = container.offsetWidth;
    const height = 500;
    
    // Set actual canvas size (for retina displays)
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(2, 2);

    // Clear canvas with themed background
    ctx.fillStyle = 'rgba(26, 15, 10, 0.95)';
    ctx.fillRect(0, 0, width, height);

    if (analyticsData.gazePoints.length === 0) {
        ctx.fillStyle = '#d2b48c';
        ctx.font = '20px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText('No gaze data recorded yet', width / 2, height / 2);
        ctx.font = '14px Inter, sans-serif';
        ctx.fillStyle = '#a89b7a';
        ctx.fillText('Start a test session to collect eye tracking data', width / 2, height / 2 + 30);
        return;
    }

    // Create heatmap grid
    const gridSize = 20;
    const grid = {};

    // Count gaze points in each grid cell
    analyticsData.gazePoints.forEach(point => {
        // Normalize to canvas size (assume original was 1920x1080)
        const x = Math.floor((point.x / 1920) * width / gridSize);
        const y = Math.floor((point.y / 1080) * height / gridSize);
        const key = `${x},${y}`;
        grid[key] = (grid[key] || 0) + 1;
    });

    // Find max count for normalization
    const maxCount = Math.max(...Object.values(grid));

    // Draw heatmap with gradient
    Object.entries(grid).forEach(([key, count]) => {
        const [x, y] = key.split(',').map(Number);
        const intensity = count / maxCount;
        
        // Gringotts-themed gradient: dark red -> gold -> bright gold
        let r, g, b;
        if (intensity < 0.33) {
            // Dark red to orange
            r = 139 + Math.floor(intensity * 3 * 116);
            g = 69 + Math.floor(intensity * 3 * 106);
            b = 19;
        } else if (intensity < 0.66) {
            // Orange to gold
            const localIntensity = (intensity - 0.33) * 3;
            r = 212;
            g = 175 + Math.floor(localIntensity * 40);
            b = 19 + Math.floor(localIntensity * 36);
        } else {
            // Gold to bright gold
            const localIntensity = (intensity - 0.66) * 3;
            r = 212 + Math.floor(localIntensity * 43);
            g = 175 + Math.floor(localIntensity * 80);
            b = 55;
        }

        // Create radial gradient for smooth look
        const gradient = ctx.createRadialGradient(
            x * gridSize + gridSize/2, 
            y * gridSize + gridSize/2, 
            0,
            x * gridSize + gridSize/2, 
            y * gridSize + gridSize/2, 
            gridSize
        );
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity * 0.9})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    });

    // Draw overlay with stats
    ctx.fillStyle = 'rgba(26, 15, 10, 0.8)';
    ctx.fillRect(0, 0, width, 60);
    
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 18px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${analyticsData.gazePoints.length} Gaze Points Recorded`, width / 2, 25);
    
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#d2b48c';
    const duration = analyticsData.sessionStart ? 
        Math.floor((Date.now() - analyticsData.sessionStart) / 1000) : 0;
    ctx.fillText(`Session Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`, width / 2, 45);
}

// ═══════════════════════════════════════════════════════════
// REALTIME UPDATES
// ═══════════════════════════════════════════════════════════

function startRealtimeUpdates() {
    // Check for new data every 2 seconds
    setInterval(() => {
        loadAnalyticsData();
        updateAllMetrics();
    }, 2000);
}

// ═══════════════════════════════════════════════════════════
// BUTTON HANDLERS
// ═══════════════════════════════════════════════════════════

function initializeButtons() {
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAllData);
    
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    
    const startTestBtn = document.getElementById('startTestBtn');
    if (startTestBtn) {
        startTestBtn.addEventListener('click', () => {
            window.location.href = 'payment-gateway.html?tracking=on';
        });
    }
}

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════

console.log('📊 Gringotts Dashboard initialized');