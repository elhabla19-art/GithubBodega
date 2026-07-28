// Configuracion desde el HTML
const GITHUB_USERNAME = window.APP_CONFIG?.GITHUB_USERNAME || 'elhabla19-art';
const API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;

// DOM Elements
const projectsContainer = document.getElementById('projectsContainer');
const projectCount = document.getElementById('projectCount');

// Funcion para obtener el favicon del proyecto
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

// Funcion para probar si una imagen existe
function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => resolve(null);
        img.src = url + '?t=' + Date.now();
    });
}

// Funcion para obtener el primer favicon que exista
async function getValidFavicon(repoName, username) {
    const urls = getFaviconUrl(repoName, username);
    
    for (const url of urls) {
        const validUrl = await imageExists(url);
        if (validUrl) {
            return validUrl;
        }
    }
    
    return null;
}

// Funcion para obtener el nombre limpio del proyecto
function getDisplayName(repoName) {
    return repoName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Funcion para obtener el color de fondo basado en el nombre
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

// Funcion para cargar los proyectos
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
        
        // Filtrar solo repositorios publicos con GitHub Pages habilitado
        const publicPagesRepos = repos.filter(repo => {
            return repo.visibility === 'public' && repo.has_pages === true;
        });

        projectCount.textContent = `${publicPagesRepos.length} proyectos disponibles`;

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
        projectCount.textContent = 'Error al cargar proyectos';
    }
}

// Funcion para renderizar los proyectos
async function renderProjects(repos) {
    let html = '';
    const faviconPromises = [];
    
    for (const repo of repos) {
        const displayName = getDisplayName(repo.name);
        const projectUrl = `https://${GITHUB_USERNAME}.github.io/${repo.name}/`;
        const color = getColorFromName(repo.name);
        
        faviconPromises.push(
            getValidFavicon(repo.name, GITHUB_USERNAME)
        );
        
        html += `
            <div class="project-item" data-repo="${repo.name}" onclick="window.open('${projectUrl}', '_blank')">
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
                    <a href="${projectUrl}" target="_blank">${displayName}</a>
                </div>
            </div>
        `;
    }
    
    projectsContainer.innerHTML = html;
    
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
}

// Iniciar carga
loadProjects();