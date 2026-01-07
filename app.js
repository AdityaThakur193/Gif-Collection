// GIF Collection App - Main JavaScript

let currentIndex = 0;
let filteredGifs = [...gifData];
let displayedCount = 24;
const LOAD_INCREMENT = 24;
let currentColumns = 4;
let slideshowInterval = null;
let currentZoom = 1;
let lastFocusedElement = null;
let trapFocusListener = null;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const GIF_BASE = 'Gif_Dump/';
const resolveSrc = (src) => src.startsWith(GIF_BASE) ? src : `${GIF_BASE}${src}`;

// Initialize
function init() {
    loadFromHash();
    renderGallery();
    setupEventListeners();
    setupScrollListener();
    setupTooltips();
}

// Setup tooltips for modal buttons
function setupTooltips() {
    document.getElementById('copyLinkBtn').title = 'Copy Link';
    document.getElementById('fullscreenBtn').title = 'Fullscreen';
    document.getElementById('zoomInBtn').title = 'Zoom In (+)';
    document.getElementById('zoomOutBtn').title = 'Zoom Out (-)';
    document.getElementById('zoomResetBtn').title = 'Reset Zoom';
}

// Render Gallery
function renderGallery() {
    const gallery = document.getElementById('gallery-grid');
    const toDisplay = filteredGifs.slice(0, displayedCount);

    // Update grid columns
    gallery.style.gridTemplateColumns = `repeat(${currentColumns}, 1fr)`;

    // Clear existing nodes safely
    while (gallery.firstChild) {
        gallery.removeChild(gallery.firstChild);
    }

    toDisplay.forEach((gif, index) => {
        const resolvedSrc = resolveSrc(gif.src);
        const card = document.createElement('div');
        card.className = 'gif-card loading';
        card.dataset.index = index;

        const img = document.createElement('img');
        img.src = resolvedSrc;
        img.alt = gif.title;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('load', () => {
            card.classList.remove('loading');
        });

        const overlay = document.createElement('div');
        overlay.className = 'gif-card-overlay';

        const title = document.createElement('div');
        title.className = 'gif-title';
        title.textContent = gif.title;

        overlay.appendChild(title);
        card.appendChild(img);
        card.appendChild(overlay);

        card.addEventListener('click', () => openModal(index));
        gallery.appendChild(card);
    });

    // Hide load more if all displayed
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    loadMoreBtn.style.display = displayedCount >= filteredGifs.length ? 'none' : 'block';
}

// Setup Event Listeners
function setupEventListeners() {
    // Load More
    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        displayedCount += LOAD_INCREMENT;
        renderGallery();
    });

    // Grid Density
    document.querySelectorAll('.density-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.density-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentColumns = parseInt(btn.dataset.columns);
            renderGallery();
        });
    });

    // Random GIF
    document.getElementById('randomBtn').addEventListener('click', () => {
        const randomIndex = Math.floor(Math.random() * filteredGifs.length);
        openModal(randomIndex);
    });

    // Slideshow
    document.getElementById('slideshowBtn').addEventListener('click', toggleSlideshow);

    // Back to Top
    document.getElementById('backToTop').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Modal
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('prevBtn').addEventListener('click', prevGif);
    document.getElementById('nextBtn').addEventListener('click', nextGif);
    document.getElementById('downloadBtn').addEventListener('click', downloadGif);
    document.getElementById('copyLinkBtn').addEventListener('click', copyLink);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => zoomGif(0.2));
    document.getElementById('zoomOutBtn').addEventListener('click', () => zoomGif(-0.2));
    document.getElementById('zoomResetBtn').addEventListener('click', resetZoom);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const modalActive = document.getElementById('gifModal').classList.contains('active');
        const helpActive = document.getElementById('helpModal').classList.contains('active');
        const isFullscreen = document.fullscreenElement !== null;
        
        // Help modal
        if (e.key === '?' && !modalActive && !helpActive) {
            e.preventDefault();
            document.getElementById('helpModal').classList.add('active');
            return;
        }

        if (e.key === 'Escape') {
            if (helpActive) {
                document.getElementById('helpModal').classList.remove('active');
            } else if (isFullscreen) {
                // Exit fullscreen first
                document.exitFullscreen().catch(err => {
                    // If fullscreen exit fails, close modal
                    if (modalActive) closeModal();
                });
            } else if (modalActive) {
                closeModal();
            }
            return;
        }

        if (!modalActive) return;

        if (e.key === 'ArrowLeft') prevGif();
        if (e.key === 'ArrowRight') nextGif();
        if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        if (e.key === 's' || e.key === 'S') toggleSlideshow();
        if (e.key === 'r' || e.key === 'R') {
            const randomIndex = Math.floor(Math.random() * filteredGifs.length);
            openModal(randomIndex);
        }
        if (e.key === '+' || e.key === '=') zoomGif(0.2);
        if (e.key === '-' || e.key === '_') zoomGif(-0.2);
    });

    // Close modals on outside click
    document.getElementById('gifModal').addEventListener('click', (e) => {
        if (e.target.id === 'gifModal') closeModal();
    });
    document.getElementById('helpModal').addEventListener('click', (e) => {
        if (e.target.id === 'helpModal') {
            document.getElementById('helpModal').classList.remove('active');
        }
    });
}

// Scroll listener for back to top button
function setupScrollListener() {
    window.addEventListener('scroll', () => {
        const backToTop = document.getElementById('backToTop');
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
}

// Modal Functions
function openModal(index) {
    currentIndex = index;
    const gif = filteredGifs[index];
    const resolvedSrc = resolveSrc(gif.src);
    const modal = document.getElementById('gifModal');
    const img = document.getElementById('modalGif');
    const container = document.getElementById('modalGifContainer');
    lastFocusedElement = document.activeElement;
    
    img.src = resolvedSrc;
    resetZoom();
    
    // Set blurred background
    container.style.setProperty('--bg-image', `url('${resolvedSrc}')`);
    container.style.backgroundImage = `var(--bg-image)`;
    
    document.getElementById('modalTitle').textContent = gif.title;
    document.getElementById('modalInfo').textContent = `${index + 1} of ${filteredGifs.length}`;
    
    // Update hash for direct linking
    window.location.hash = `gif-${gifData.findIndex(g => g.src === gif.src) + 1}`;
    
    // Load image metadata
    img.onload = () => {
        const fileSize = 'N/A'; // File size would need server support
            document.getElementById('modalMetadata').textContent = 
                `Dimensions: ${img.naturalWidth} × ${img.naturalHeight}px`;
    };
    enableModalFocusTrap();
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    stopSlideshow();
    
    // Exit fullscreen if active
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
            console.log('Exit fullscreen error:', err);
        });
    }
    
    document.getElementById('gifModal').classList.remove('active');
    document.body.style.overflow = '';
    const modal = document.getElementById('gifModal');
    if (trapFocusListener) {
        modal.removeEventListener('keydown', trapFocusListener);
        trapFocusListener = null;
    }
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    }
    history.replaceState(null, '', window.location.pathname);
}

function enableModalFocusTrap() {
    const modal = document.getElementById('gifModal');
    const focusables = Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    trapFocusListener = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };
    modal.addEventListener('keydown', trapFocusListener);
    first.focus();
}

function nextGif() {
    if (currentIndex < filteredGifs.length - 1) {
        openModal(currentIndex + 1);
    } else if (slideshowInterval) {
        openModal(0); // Loop in slideshow
    }
}

function prevGif() {
    if (currentIndex > 0) {
        openModal(currentIndex - 1);
    }
}

function downloadGif() {
    const gif = filteredGifs[currentIndex];
    const link = document.createElement('a');
    link.href = resolveSrc(gif.src);
    link.download = gif.title.replace(/\s+/g, '_') + '.gif';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// New feature functions
function copyLink() {
    const gif = filteredGifs[currentIndex];
    const gifIndex = gifData.findIndex(g => g.src === gif.src) + 1;
    const url = `${window.location.origin}${window.location.pathname}#gif-${gifIndex}`;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyLinkBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.title = 'Copied!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.title = 'Copy Link';
        }, 2000);
    });
}

function toggleFullscreen() {
    const modalContent = document.querySelector('.modal-content');
    const btn = document.getElementById('fullscreenBtn');
    if (!document.fullscreenElement) {
        modalContent.requestFullscreen();
        btn.innerHTML = '<i class="fas fa-compress"></i>';
        btn.title = 'Exit Fullscreen';
    } else {
        document.exitFullscreen();
        btn.innerHTML = '<i class="fas fa-expand"></i>';
        btn.title = 'Fullscreen';
    }
}

function zoomGif(delta) {
    currentZoom = Math.max(0.5, Math.min(3, currentZoom + delta));
    document.getElementById('modalGif').style.transform = `scale(${currentZoom})`;
}

function resetZoom() {
    currentZoom = 1;
    document.getElementById('modalGif').style.transform = 'scale(1)';
}

function toggleSlideshow() {
    if (slideshowInterval) {
        stopSlideshow();
    } else {
        startSlideshow();
    }
}

function startSlideshow() {
    if (prefersReducedMotion.matches) {
        const btn = document.getElementById('slideshowBtn');
        btn.title = 'Disabled due to reduced motion preference';
        return;
    }
    const btn = document.getElementById('slideshowBtn');
    btn.classList.add('active');
    btn.querySelector('i').className = 'fas fa-pause';
    document.getElementById('slideshowText').textContent = 'Stop Slideshow';
    
    if (!document.getElementById('gifModal').classList.contains('active')) {
        openModal(0);
    }
    
    slideshowInterval = setInterval(() => {
        nextGif();
    }, 3000);
}

function stopSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
        const btn = document.getElementById('slideshowBtn');
        btn.classList.remove('active');
        btn.querySelector('i').className = 'fas fa-play';
        document.getElementById('slideshowText').textContent = 'Start Slideshow';
    }
}

function loadFromHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#gif-')) {
        const gifNum = parseInt(hash.replace('#gif-', ''));
        if (gifNum > 0 && gifNum <= gifData.length) {
            setTimeout(() => openModal(gifNum - 1), 100);
        }
    }
}

// Theme Toggle
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// Navigation and About Section
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    const gallerySection = document.getElementById('gallery');
    const aboutSection = document.getElementById('about');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            if (href === '#about') {
                e.preventDefault();
                gallerySection.style.display = 'none';
                aboutSection.classList.add('active');
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (href === '#gallery') {
                e.preventDefault();
                aboutSection.classList.remove('active');
                gallerySection.style.display = 'block';
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                window.scrollTo({ top: document.getElementById('gallery').offsetTop - 60, behavior: 'smooth' });
            } else if (href === '#home') {
                e.preventDefault();
                aboutSection.classList.remove('active');
                gallerySection.style.display = 'block';
                navLinks.forEach(l => l.classList.remove('active'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
    initTheme();
    init();
    setupNavigation();
});
