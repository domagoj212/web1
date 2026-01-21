// Language switching functionality
let translations = {};
let currentLang = localStorage.getItem('language') || 'hr';

// Load translations
async function loadTranslations() {
    try {
        const response = await fetch('translations.json');
        translations = await response.json();
        updatePageContent();
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

// Update all page content
function updatePageContent() {
    const t = translations[currentLang];
    if (!t) return;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const keys = element.getAttribute('data-i18n').split('.');
        let value = t;
        
        for (const key of keys) {
            value = value?.[key];
        }
        
        if (value) {
            if (element.tagName === 'INPUT' && element.type === 'email') {
                element.placeholder = value;
            } else {
                element.innerHTML = value;
            }
        }
    });

    // Update service items
    updateServiceItems();
    
    // Update language toggle button
    updateLanguageToggle();
    
    // Update page title and meta description
    updateMetaTags();
}

// Update service list items
function updateServiceItems() {
    const t = translations[currentLang];
    if (!t) return;

    // Digital services
    const digitalItems = document.querySelector('.accordion-card:nth-child(1) .accordion-dropdown');
    if (digitalItems && t.services.digital.items) {
        const itemsHTML = t.services.digital.items.map(item => `<p>${item}</p>`).join('');
        digitalItems.innerHTML = `<p>${t.services.digital.desc}</p>${itemsHTML}`;
    }

    // Engineering services
    const engineeringItems = document.querySelector('.accordion-card:nth-child(2) .accordion-dropdown');
    if (engineeringItems && t.services.engineering.items) {
        const itemsHTML = t.services.engineering.items.map(item => `<p>${item}</p>`).join('');
        engineeringItems.innerHTML = `<p>${t.services.engineering.desc}</p>${itemsHTML}`;
    }
}

// Update language toggle button
function updateLanguageToggle() {
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.textContent = currentLang.toUpperCase();
        langToggle.setAttribute('aria-label', currentLang === 'hr' ? 'Switch to English' : 'Prebaci na Hrvatski');
    }
}

// Update meta tags for SEO
function updateMetaTags() {
    if (currentLang === 'en') {
        document.title = 'Konstrukt Tech Engineering | Structural Design, Digital Solutions for Construction | Zadar';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = 'Konstrukt Tech Engineering Ltd. - Certified civil engineers in Zadar. Structural design, PowerBI and digital solutions, BIM technology, expert supervision and construction project management.';
        }
    } else {
        document.title = 'Konstrukt Tech Inženjering | Projektiranje, Digitalna Rješenja za Građevinarstvo | Zadar';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = 'Konstrukt Tech Inženjering d.o.o. - Ovlašteni inženjeri građevinarstva u Zadru. Projektiranje konstrukcija, razvoj PowerBI i digitalnih rješenja, BIM tehnologija, stručni nadzor i vođenje građevinskih projekata.';
        }
    }
}

// Switch language
function switchLanguage() {
    currentLang = currentLang === 'hr' ? 'en' : 'hr';
    localStorage.setItem('language', currentLang);
    updatePageContent();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadTranslations();
    
    // Add event listener to language toggle button
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', switchLanguage);
    }
});

// Accordion functionality
document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', function() {
        const content = this.nextElementSibling;
        const isActive = this.classList.contains('active');
        
        // Close all accordions
        document.querySelectorAll('.accordion-header').forEach(h => {
            h.classList.remove('active');
            h.nextElementSibling.classList.remove('active');
        });
        
        // Open clicked accordion if it wasn't active
        if (!isActive) {
            this.classList.add('active');
            content.classList.add('active');
        }
    });
});

// Contact form accordion functionality
const contactAccordion = document.getElementById('contact-accordion');
if (contactAccordion) {
    contactAccordion.addEventListener('click', function(e) {
        // Don't toggle if clicking inside the form
        if (this.classList.contains('active') && e.target.closest('.accordion-dropdown')) {
            return;
        }
        this.classList.toggle('active');
    });
}

// Contact form AJAX submission
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formMessage = document.getElementById('form-message');
        const submitBtn = contactForm.querySelector('.submit-btn');
        const formData = new FormData(contactForm);
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        submitBtn.textContent = currentLang === 'en' ? 'Sending...' : 'Šaljem...';
        formMessage.textContent = '';
        formMessage.className = 'form-message';
        
        try {
            const response = await fetch('https://formspree.io/f/mkogrgyz', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                formMessage.textContent = currentLang === 'en' 
                    ? '✓ Message sent successfully! We will contact you soon.' 
                    : '✓ Poruka uspješno poslana! Javit ćemo vam se uskoro.';
                formMessage.className = 'form-message success';
                contactForm.reset();
            } else {
                throw new Error('Form submission failed');
            }
        } catch (error) {
            formMessage.textContent = currentLang === 'en' 
                ? '✗ An error occurred. Please try again or email us directly at info@kti.hr' 
                : '✗ Došlo je do greške. Pokušajte ponovo ili nam pošaljite email na info@kti.hr';
            formMessage.className = 'form-message error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = currentLang === 'en' ? 'Send message' : 'Pošalji poruku';
        }
    });
}
