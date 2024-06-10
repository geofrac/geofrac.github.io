let map = L.map('map', {
    center: [48.864716, 2.349014],
    zoom: 6,
    minZoom: 3,
    maxZoom: 12,
    maxBounds: [
        [-90, -180],
        [90, 180]
    ],
    maxBoundsViscosity: 1.0
});


L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: true,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

let markers = {};
let linksData = {};
let placesData = {};
let artworksData = {};
let polylines = [];
let sidebarOpen = false;

function fetchData() {
    return Promise.all([
        d3.csv("./data/places.csv"),
        d3.csv("./data/links.csv"),
        d3.csv("./data/artworks.csv")
    ]);
}

function createCustomIcon(color) {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color:${color}; width:20px; height:20px; border-radius:50%;box-shadow: 0px 0px 0px 3px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

function addMarkerForId(id) {
    let place = placesData[id];
    if (place) {
        let customIcon = createCustomIcon(place.color);
        let marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(map);

        if (place.type === 'frac') {
            marker.on('click', function() {
                displayMarkersForFrac(id);
            });
        } else if (place.type === 'artist') {
            marker.on('click', function() {
                displayArtworksForArtist(id);
            });
            marker.on('mouseover', function() {
                marker.bindPopup(place.name).openPopup();
            });
            marker.on('mouseout', function() {
                marker.closePopup();
            });
        }

        markers[id] = marker;
    }
}

function displayMarkersForFrac(frac_id) {
    Object.keys(markers).forEach(key => map.removeLayer(markers[key]));
    polylines.forEach(polyline => map.removeLayer(polyline));
    polylines = [];

    addMarkerForId(frac_id);

    let associatedLinks = linksData[frac_id] || [];

    associatedLinks.forEach(artist_id => {
        if (!placesData[artist_id]) {
            return; // Skip this artist_id if no corresponding place data is found
        }

        addMarkerForId(artist_id);
        let start = [placesData[frac_id].lat, placesData[frac_id].lng];
        let end = [placesData[artist_id].lat, placesData[artist_id].lng];
        let polyline = L.polyline([start, end], { color: '#000000', weight: 5, opacity: 0.2 }).addTo(map);
        polylines.push(polyline);
    });

    document.getElementById('returnButton').style.display = 'block';
}

document.getElementById('returnButton').addEventListener('click', function() {
    console.log('Return button clicked'); // Debugging statement
    resetMap();
});


function displayArtworksForArtist(artist_id) {
    let sidebar = document.getElementById('sidebar');
    let toggle = document.getElementById('toggleSidebar');
    
    sidebar.innerHTML = '';
    sidebar.style.display = 'block';
    sidebar.style.right = '0';
    toggle.style.display = 'block';
    toggle.style.right = '300px';
    sidebarOpen = true;

    let artistName = placesData[artist_id].name;

    let artistHeader = document.createElement('h2');
    artistHeader.className = 'artist-name';
    artistHeader.textContent = artistName;
    sidebar.appendChild(artistHeader);

    let artworks = artworksData[artist_id] || [];

    artworks.forEach(artwork => {
        let div = document.createElement('div');
        div.className = 'artwork-item';
        div.innerHTML = `
            <h3 class="artwork-title">${artwork.title}</h3>
            <p class="artwork-details">${artwork.date} - ${artwork.medium}</p>
            <img src="${artwork.picture_path}" class="artwork-image">
            <hr class="artwork-separator">
        `;
        sidebar.appendChild(div);
    });

    console.log(`Displaying ${artworks.length} artworks for artist ${artist_id}`);
}


function resetMap() {
    Object.keys(markers).forEach(key => map.removeLayer(markers[key]));
    polylines.forEach(polyline => map.removeLayer(polyline));
    polylines = [];
    markers = {};
    loadFracsMarkers();
    document.getElementById('returnButton').style.display = 'none';
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('sidebar').style.right = '-300px'; // Hide sidebar
    document.getElementById('toggleSidebar').style.display = 'none'; // Hide toggle button
    sidebarOpen = false;
}

function loadFracsMarkers() {
    for (let id in placesData) {
        if (placesData[id].type === 'frac') {
            addMarkerForId(id);
        }
    }
}

document.getElementById('returnButton').addEventListener('click', resetMap);

document.getElementById('toggleSidebar').addEventListener('click', function() {
    let sidebar = document.getElementById('sidebar');
    let toggle = document.getElementById('toggleSidebar');
    if (sidebarOpen) {
        sidebar.style.right = '-320px';
        toggle.style.right = '0px';
        toggle.innerHTML = '>';
    } else {
        sidebar.style.right = '0';
        toggle.style.right = '320px';
        toggle.innerHTML = '<';
    }
    sidebarOpen = !sidebarOpen;
});

window.onload = function() {
    let modal = document.getElementById('infoModal');
    modal.style.display = 'block';

    let closeModal = function() {
        modal.style.display = 'none';
    };

    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('closeModalButton').onclick = closeModal;

    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
};

const legend = L.control({ position: 'bottomleft' });

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
        <i style="background: #7678ED;"></i> FRAC<br>
        <i style="background: #3D348B;"></i> Graphisme<br>
        <i style="background: #F35B04;"></i> Ouvrage<br>
        <i style="background: #F7B801;"></i> Objet<br>
        <i style="background: #6FC572;"></i> Architecture<br>
    `;
    return div;
};

legend.addTo(map);

fetchData().then(function(files) {
    const places = files[0];
    const links = files[1];
    const artworks = files[2];

    places.forEach(place => {
        placesData[place.id] = {
            name: place.name,
            type: place.type,
            lat: place.latitude,
            lng: place.longitude,
            color: place.color
        };
    });

    links.forEach(link => {
        if (!linksData[link.frac_id]) {
            linksData[link.frac_id] = [];
        }
        linksData[link.frac_id].push(link.artist_id);
    });

    artworks.forEach(artwork => {
        if (!artworksData[artwork.artist_id]) {
            artworksData[artwork.artist_id] = [];
        }
        artworksData[artwork.artist_id].push({
            title: artwork.title,
            date: artwork.date,
            medium: artwork.medium,
            picture_path: artwork.picture_path
        });
    });

    loadFracsMarkers();
    console.log('Data loaded and markers initialized.');
});