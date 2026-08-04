// Configuracion
const GITHUB_USERNAME = window.APP_CONFIG?.GITHUB_USERNAME || 'elhabla19-art';
const API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;
const ROOM_CODE = window.APP_CONFIG?.DEFAULT_ROOM_CODE || 'GRIL';

// DOM Elements
const projectsContainer = document.getElementById('projectsContainer');
const filterHeader = document.getElementById('filterHeader');
const filterDropdown = document.getElementById('filterDropdown');
const filterTopicsContainer = document.getElementById('filterTopicsContainer');

// Estado
let allProjects = [];
let currentFilter = null;
let allTopics = new Set();
let isDropdownOpen = false;
let syncEnabled = false;

// ===== SINCRONIZACION DE SALAS =====
function initSync() {
    const syncCheckbox = document.getElementById('syncToggle');
    const syncIndicator = document.getElementById('syncIndicator');
    
    if (!syncCheckbox) return;
    
    // Cargar estado guardado
    const savedState = localStorage.getItem('syncEnabled');
    if (savedState === 'true') {
        syncEnabled = true;
        syncCheckbox.checked = true;
        updateSyncUI(syncIndicator);
    }
    
    // Evento del checkbox
    syncCheckbox.addEventListener('change', function() {
        syncEnabled = this.checked;
        localStorage.setItem('syncEnabled', syncEnabled);
        updateSyncUI(syncIndicator);
        // Cerrar dropdown al cambiar el estado
        closeDropdown();
    });
}

function updateSyncUI(indicator) {
    if (!indicator) return;
    if (syncEnabled) {
        indicator.textContent = 'GRIL';
        indicator.classList.add('active');
    } else {
        indicator.textContent = '';
        indicator.classList.remove('active');
    }
}

// Abrir proyecto con o sin parametro de sala
function openProject(projectName) {
    const url = window.APP_CONFIG?.PROJECTS?.[projectName];
    if (!url) {
        // Fallback: construir URL desde el nombre del repo
        const fallbackUrl = `https://${GITHUB_USERNAME}.github.io/${projectName}/`;
        const finalUrl = syncEnabled ? fallbackUrl + '?auto=1' : fallbackUrl;
        window.open(finalUrl, '_blank');
        return;
    }
    
    let finalUrl = url;
    if (syncEnabled) {
        // Añadir el parametro auto=1 si la URL no lo tiene ya
        finalUrl = url + (url.includes('?') ? '&auto=1' : '?auto=1');
    }
    window.open(finalUrl, '_blank');
}

// ===== UTILIDADES =====
function getFaviconUrl(repoName, username) {
    const baseUrl = `https://${username}.github.io/${repoName}`;
    return [
        `${baseUrl}/favicon.svg`,
        `${baseUrl}/favicon.jpg`,
        `${baseUrl}/favicon.jpeg`,
        `${baseUrl}/favicon.png`,
        `${baseUrl}/favicon.ico`
    ];
}

function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => resolve(null);
        img.src = url + '?t=' + Date.now();
    });
}

async function getValidFavicon(repoName, username) {
    const urls = getFaviconUrl(repoName, username);
    for (const url of urls) {
        const validUrl = await imageExists(url);
        if (validUrl) return validUrl;
    }
    return null;
}

function getDisplayName(repoName) {
    return repoName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function getColorFromName(name) {
    const colors = [
        '#4CAF50', '#2196F3', '#FF9800', '#E91E63',
        '#9C27B0', '#00BCD4', '#FF5722', '#8BC34A',
        '#FFEB3B', '#607D8B', '#795548', '#9E9E9E'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== RENDERIZADO =====
function renderProjectsHTML(repos) {
    let html = '';
    if (repos.length === 0) {
        return `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #E3B5A4;">
                <p style="font-size: 1.2rem;">No hay proyectos con este tema</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem; color: #888;">Prueba con otro filtro</p>
            </div>
        `;
    }
    for (const repo of repos) {
        const displayName = getDisplayName(repo.name);
        const color = getColorFromName(repo.name);
        html += `
            <div class="project-item" data-repo="${repo.name}" onclick="openProject('${repo.name}')">
                <div class="favicon-wrapper" style="background: ${color}22; border-color: ${color}44;">
                    <div class="favicon-placeholder" style="background: ${color};">
                        ${displayName.charAt(0)}
                    </div>
                    <img
                        class="favicon-img"
                        src=""
                        alt="${displayName}"
                        style="display: none; width: 100%; height: 100%; object-fit: contain; border-radius: 6px;"
                        loading="lazy"
                    />
                </div>
                <div class="project-name">
                    <a href="#" onclick="event.preventDefault(); openProject('${repo.name}')">${displayName}</a>
                </div>
            </div>
        `;
    }
    return html;
}

async function renderProjects(repos) {
    allProjects = repos;
    allTopics = new Set();
    repos.forEach(repo => {
        (repo.topics || []).forEach(topic => allTopics.add(topic));
    });
    projectsContainer.innerHTML = renderProjectsHTML(repos);
    const faviconPromises = repos.map(repo => getValidFavicon(repo.name, GITHUB_USERNAME));
    const favicons = await Promise.all(faviconPromises);
    document.querySelectorAll('.project-item').forEach((item, index) => {
        const faviconUrl = favicons[index];
        const img = item.querySelector('.favicon-img');
        const placeholder = item.querySelector('.favicon-placeholder');
        if (faviconUrl) {
            img.src = faviconUrl;
            img.style.display = 'block';
            placeholder.style.display = 'none';
            img.onerror = function() {
                this.style.display = 'none';
                placeholder.style.display = 'flex';
            };
        } else {
            placeholder.style.display = 'flex';
        }
    });
    Animations.enter(document.querySelectorAll('.project-item'));
}

// ===== FILTRADO =====
function filterProjectsByTopic(topic) {
    if (currentFilter === topic) {
        currentFilter = null;
        document.querySelectorAll('.filter-topic-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        Animations.filterAndAnimate(
            projectsContainer,
            allProjects,
            () => {
                projectsContainer.innerHTML = renderProjectsHTML(allProjects);
                setTimeout(async () => {
                    const faviconPromises = allProjects.map(repo => getValidFavicon(repo.name, GITHUB_USERNAME));
                    const favicons = await Promise.all(faviconPromises);
                    document.querySelectorAll('.project-item').forEach((item, index) => {
                        const faviconUrl = favicons[index];
                        const img = item.querySelector('.favicon-img');
                        const placeholder = item.querySelector('.favicon-placeholder');
                        if (faviconUrl) {
                            img.src = faviconUrl;
                            img.style.display = 'block';
                            placeholder.style.display = 'none';
                            img.onerror = function() {
                                this.style.display = 'none';
                                placeholder.style.display = 'flex';
                            };
                        } else {
                            placeholder.style.display = 'flex';
                        }
                    });
                }, 50);
            }
        );
        closeDropdown();
        return;
    }

    currentFilter = topic;
    document.querySelectorAll('.filter-topic-btn').forEach(btn => {
        const btnTopic = btn.dataset.topic;
        if (btnTopic === topic) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    const filtered = allProjects.filter(repo =>
        (repo.topics || []).includes(topic)
    );
    Animations.filterAndAnimate(
        projectsContainer,
        filtered,
        () => {
            projectsContainer.innerHTML = renderProjectsHTML(filtered);
            setTimeout(async () => {
                const faviconPromises = filtered.map(repo => getValidFavicon(repo.name, GITHUB_USERNAME));
                const favicons = await Promise.all(faviconPromises);
                document.querySelectorAll('.project-item').forEach((item, index) => {
                    const faviconUrl = favicons[index];
                    const img = item.querySelector('.favicon-img');
                    const placeholder = item.querySelector('.favicon-placeholder');
                    if (faviconUrl) {
                        img.src = faviconUrl;
                        img.style.display = 'block';
                        placeholder.style.display = 'none';
                        img.onerror = function() {
                            this.style.display = 'none';
                            placeholder.style.display = 'flex';
                        };
                    } else {
                        placeholder.style.display = 'flex';
                    }
                });
            }, 50);
        }
    );
    closeDropdown();
}

// ===== DROPDOWN =====
function toggleDropdown() {
    if (isDropdownOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

function openDropdown() {
    const topicsArray = Array.from(allTopics).sort();
    if (topicsArray.length === 0) {
        filterTopicsContainer.innerHTML = `
            <p style="color: #E3B5A4; text-align: center; padding: 1rem; width: 100%;">
                No hay topics disponibles
            </p>
        `;
    } else {
        filterTopicsContainer.innerHTML = topicsArray.map(topic => `
            <button class="filter-topic-btn ${currentFilter === topic ? 'active' : ''}"
                    data-topic="${topic}"
                    onclick="filterProjectsByTopic('${topic}')">
                #${capitalize(topic)}
                <span class="topic-count">${allProjects.filter(repo => (repo.topics || []).includes(topic)).length}</span>
            </button>
        `).join('');
    }
    Animations.openDropdown(filterDropdown);
    isDropdownOpen = true;
}

function closeDropdown() {
    if (!isDropdownOpen) return;
    Animations.closeDropdown(filterDropdown, () => {
        isDropdownOpen = false;
    });
}

// ===== EVENT LISTENERS =====
filterHeader.addEventListener('click', toggleDropdown);

document.addEventListener('click', function(event) {
    if (isDropdownOpen) {
        const target = event.target;
        const isHeader = filterHeader.contains(target);
        const isDropdown = filterDropdown.contains(target);
        if (!isHeader && !isDropdown) {
            closeDropdown();
        }
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && isDropdownOpen) {
        closeDropdown();
    }
});

// ===== QR MODAL =====
const qrModal = document.getElementById('qrModal');
const qrButton = document.getElementById('qrButton');

qrButton.addEventListener('click', function() {
    Animations.openModal(qrModal);
});

qrModal.addEventListener('click', function(event) {
    if (event.target === qrModal) {
        Animations.closeModal(qrModal);
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && qrModal.classList.contains('show')) {
        Animations.closeModal(qrModal);
    }
});

// ===== CARGA INICIAL =====
async function loadProjects() {
    try {
        projectsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Cargando bodega...</p>
            </div>
        `;
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const repos = await response.json();
        const publicPagesRepos = repos.filter(repo => {
            return repo.visibility === 'public' &&
                   repo.has_pages === true &&
                   !repo.topics.includes('inicio');
        });
        if (publicPagesRepos.length === 0) {
            projectsContainer.innerHTML = `
                <div class="error">
                    <p>No se encontraron proyectos publicos con GitHub Pages habilitado</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem; color: #888;">
                        Usuario: ${GITHUB_USERNAME}
                    </p>
                </div>
            `;
            return;
        }
        await renderProjects(publicPagesRepos);
    } catch (error) {
        console.error('Error al cargar proyectos:', error);
        projectsContainer.innerHTML = `
            <div class="error">
                <p>Error al cargar la bodega</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem; color: #888;">
                    Usuario: ${GITHUB_USERNAME}<br>
                    ${error.message}
                </p>
            </div>
        `;
    }
}

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.filterProjectsByTopic = filterProjectsByTopic;
window.capitalize = capitalize;
window.openProject = openProject;

// ===== INICIALIZAR =====
document.addEventListener('DOMContentLoaded', function() {
    initSync();
    loadProjects();
});