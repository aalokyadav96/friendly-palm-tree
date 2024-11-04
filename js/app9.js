const API_URL = "https://qualms.onrender.com/api"; // Adjust the URL as needed

// State management
const state = {
    token: localStorage.getItem("token"),
    userProfile: null,
};

window.state = state;

async function navigate(loc) {
    window.history.pushState({}, "", loc);
    renderPage();
}

// Function to initialize the app
function init() {
    renderPage();
    window.onpopstate = renderPage; // Handle back/forward navigation
}

window.navigate = navigate;
window.renderPage = renderPage; // Make renderPage globally accessible

async function fetchProfile() {
    // Check if profile is cached in localStorage
    // const cachedProfile = localStorage.getItem("userProfile");
    // if (cachedProfile) {
    //     state.userProfile = JSON.parse(cachedProfile);
    //     return state.userProfile; // Return cached profile
    // }

    if (state.token) {
        try {
            const response = await fetch(`${API_URL}/profile`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${state.token}`,
                },
            });
            if (response.ok) {
                const profile = await response.json();
                state.userProfile = profile;
                localStorage.setItem("userProfile", JSON.stringify(profile)); // Cache the profile in localStorage
                return profile; // Return the fetched profile
            } else {
                const errorData = await response.json();
                console.error(`Error fetching profile: ${response.status} - ${response.statusText}`, errorData);
                showSnackbar(`Error fetching profile: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    } else {
        state.userProfile = null;
    }
    return null; // Return null if no profile found
}

async function createEventForm() {
    const createSection = document.getElementById("create-section");
    if (state.token) {
        createSection.innerHTML = `
            <h2>Create Event</h2>
            <input type="text" id="event-title" placeholder="Event Title" required />
            <textarea id="event-description" placeholder="Event Description" required></textarea>
            <input type="text" id="event-place" placeholder="Event Place" required />
            <input type="text" id="event-location" placeholder="Event Location" required />
            <input type="date" id="event-date" required />
            <input type="time" id="event-time" required />
            <input type="text" id="organizer-name" placeholder="Organizer Name" required />
            <input type="text" id="organizer-contact" placeholder="Organizer Contact" required />
            <input type="number" id="total-capacity" placeholder="Total Capacity" required />
            <input type="url" id="website-url" placeholder="Website URL" />
            <input type="text" id="category" placeholder="Category" required />
            <input type="file" id="event-banner" accept="image/*" />
            <button onclick="window.createEvent()">Create Event</button>
        `;
    } else {
        navigate('/login');
    }
}

async function createPlaceForm() {
    const createSection = document.getElementById("create-place-section");
    if (state.token) {
        createSection.innerHTML = `
            <h2>Create Place</h2>
            <input type="text" id="place-name" placeholder="Place Name" required />
            <input type="text" id="place-address" placeholder="Address" required />
            <input type="text" id="place-city" placeholder="City" required />
            <input type="text" id="place-country" placeholder="Country" required />
            <input type="text" id="place-zipcode" placeholder="Zip Code" required />
            <textarea id="place-description" placeholder="Description" required></textarea>
            <input type="number" id="capacity" placeholder="Capacity" required />
            <input type="text" id="phone" placeholder="Phone Number" />
            <input type="url" id="website" placeholder="Website URL" />
            <input type="text" id="category" placeholder="Category" />
            <input type="file" id="place-banner" accept="image/*" />
            <button onclick="window.createPlace()">Create Place</button>
        `;
    } else {
        navigate('/login');
    }
}

let abortController;

async function fetchEvents() {
    // Abort the previous fetch if it's still ongoing
    if (abortController) {
        abortController.abort();
    }

    abortController = new AbortController(); // Create a new instance
    const signal = abortController.signal; // Get the signal to pass to fetch

    try {
        const response = await fetch('/api/events', { signal });
        if (!response.ok) throw new Error('Failed to fetch events');
        return await response.json();
    } catch (error) {
        // Check if the error is due to an abort
        if (error.name === 'AbortError') {
            console.log('Fetch aborted');
            return null; // Return null for aborted fetch
        }
        console.error(error);
        return null; // Return null for other errors
    }
}

async function fetchPlaces() {
    // Abort the previous fetch if it's still ongoing
    if (abortController) {
        abortController.abort();
    }

    abortController = new AbortController(); // Create a new instance
    const signal = abortController.signal; // Get the signal to pass to fetch

    try {
        const response = await fetch('/api/places', { signal });
        if (!response.ok) throw new Error('Failed to fetch places');
        return await response.json();
    } catch (error) {
        // Check if the error is due to an abort
        if (error.name === 'AbortError') {
            console.log('Fetch aborted');
            return null; // Return null for aborted fetch
        }
        console.error(error);
        return null; // Return null for other errors
    }
}

async function createEvent() {
    if (state.token) {
        const title = document.getElementById("event-title").value.trim();
        const date = document.getElementById("event-date").value;
        const time = document.getElementById("event-time").value;
        const place = document.getElementById("event-place").value;
        const location = document.getElementById("event-location").value.trim();
        const description = document.getElementById("event-description").value.trim();
        const bannerFile = document.getElementById("event-banner").files[0];

        // Validate input values
        if (!title || !date || !time || !place || !location || !description) {
            showSnackbar("Please fill in all fields.");
            return;
        }

        const formData = new FormData();
        formData.append('event', JSON.stringify({
            title,
            date: `${date}T${time}`,
            location,
            place,
            description,
        }));
        if (bannerFile) {
            formData.append('banner', bannerFile);
        }

        try {
            const result = await apiFetch('/event', 'POST', formData);
            showSnackbar(`Event created successfully: ${result.title}`);
            navigate('/event/' + result.eventid);
        } catch (error) {
            showSnackbar(`Error creating event: ${error.message}`);
        }
    } else {
        navigate('/login');
    }
};


async function updateEvent(eventId) {
    if (!state.token) {
        showSnackbar("Please log in to update event.");
        return;
    }

    const title = document.getElementById("event-title").value.trim();
    const date = document.getElementById("event-date").value;
    const time = document.getElementById("event-time").value;
    const place = document.getElementById("event-place").value.trim();
    const location = document.getElementById("event-location").value.trim();
    const description = document.getElementById("event-description").value.trim();
    const bannerFile = document.getElementById("event-banner").files[0];

    // Validate input values
    if (!title || !date || !time || !place || !location || !description) {
        showSnackbar("Please fill in all fields.");
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('date', date);
    formData.append('time', time);
    formData.append('place', place);
    formData.append('location', location);
    formData.append('description', description);
    if (bannerFile) {
        formData.append('event-banner', bannerFile);
    }

    try {
        const result = await apiFetch(`/event/${eventId}`, 'PUT', formData);
        showSnackbar(`event updated successfully: ${result.title}`);
        navigate('/event/' + result.eventid);
    } catch (error) {
        showSnackbar(`Error updating event: ${error.message}`);
    }
};

function handleError(errorMessage) {
    console.error(errorMessage);
}

function validateInputs(inputs) {
    const errors = [];

    inputs.forEach(({ value, validator, message }) => {
        if (!validator(value)) {
            errors.push(message);
        }
    });

    return errors.length ? errors.join('\n') : null;
}

// Example validators
const isValidUsername = username => username.length >= 3 && username.length <= 20;
const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = password => password.length >= 6;

async function displayProfile() {
    const profileSection = document.getElementById("profile-section");
    const profile = await fetchProfile();

    if (profile) {
        profileSection.innerHTML = generateProfileHTML(profile);
        displayActivityFeed();
        displayFollowSuggestions();
    } else {
        profileSection.innerHTML = "<p>Please log in to see your profile.</p>";
    }
}

function generateProfileHTML(profile) {
    return `
        <p>Username: ${profile.username || 'Not provided.'}</p>
        <p>Email: ${profile.email || 'Not provided.'}</p>
        <p>Name: ${profile.name || 'Not provided.'}</p>
        <p>Bio: ${profile.bio || 'No bio available.'}</p>
        <p>Phone Number: ${profile.phone_number || 'Not provided.'}</p>
        <p>Profile Views: ${profile.profile_views || 0}</p>
        <p>Followers: ${Array.isArray(profile.followers) ? profile.followers.length : 0}</p>
        <p>Following: ${Array.isArray(profile.follows) ? profile.follows.length : 0}</p>
        <p>Address: ${profile.address || 'Not provided.'}</p>
        <p>Date of Birth: ${profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided.'}</p>
        <p>Last Login: ${profile.last_login ? new Date(profile.last_login).toLocaleString() : 'Never logged in.'}</p>
        <p>Account Status: ${profile.is_active ? 'Active' : 'Inactive'}</p>
        <p>Verification Status: ${profile.is_verified ? 'Verified' : 'Not Verified'}</p>
        <img src="/userpic/${profile.profile_picture || 'default.png'}" alt="Profile Picture" />
        <button onclick="window.editProfile()">Edit Profile</button>
        <button onclick="window.deleteProfile()">Delete Profile</button>
        <div id="activity-feed"></div>
        <div id="follow-suggestions"></div>
    `;
}

async function fetchUserProfile(username) {
    try {
        const data = await apiFetch(`/user/${username}`);
        return data.is_following !== undefined ? data : null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
}


function renderUserProfile(userProfile) {
    // Profile information with fallback values
    const followButtonLabel = userProfile.isFollowing ? 'Unfollow' : 'Follow';

    // Construct the profile page HTML
    let ppage = `
        <p>Username: ${userProfile.username || 'Not provided.'}</p>
        <p>Email: ${userProfile.email || 'Not provided.'}</p>
        <p>Name: ${userProfile.name || 'Not provided.'}</p>
        <p>Bio: ${userProfile.bio || 'No bio available.'}</p>
        <p>Phone Number: ${userProfile.phone_number || 'Not provided.'}</p>
        <p>Profile Views: ${userProfile.profile_views || 0}</p>
        <p>Followers: ${Array.isArray(userProfile.followers) ? userProfile.followers.length : 0}</p>
        <p>Following: ${Array.isArray(userProfile.follows) ? userProfile.follows.length : 0}</p>
        <p>Address: ${userProfile.address || 'Not provided.'}</p>
        <p>Date of Birth: ${userProfile.date_of_birth ? new Date(userProfile.date_of_birth).toLocaleDateString() : 'Not provided.'}</p>
        <p>Last Login: ${userProfile.last_login ? new Date(userProfile.last_login).toLocaleString() : 'Never logged in.'}</p>
        <p>Account Status: ${userProfile.is_active ? 'Active' : 'Inactive'}</p>
        <p>Verification Status: ${userProfile.is_verified ? 'Verified' : 'Not Verified'}</p>
        <img src="/userpic/${userProfile.profile_picture || 'default.png'}" alt="Profile Picture" />
    `;

    // Add follow button if the user is logged in
    if (state.token) {
        ppage += `
            <button class="follow-button" id="user-${userProfile.userid}" onclick="window.toggleFollow('${userProfile.userid}')">
                ${followButtonLabel}
            </button>
        `;
    }

    return ppage;
}


function createNav() {
    const isLoggedIn = Boolean(state.token);

    const navItems = [
        { href: '/', label: 'Home' },
        { href: '/events', label: 'Events' },
        { href: '/places', label: 'Places' },
        { href: '/profile', label: 'Profile' },
        { href: '/create', label: 'Eva' },
        { href: '/place', label: 'Loca' },
    ];

    const renderNavItems = items => items.map(item =>
        `<li><a href="${item.href}" onclick="navigate('${item.href}')">${item.label}</a></li>`
    ).join('');

    const authButton = isLoggedIn
        ? '<li><button onclick="window.logout()">Logout</button></li>'
        : '<li><button onclick="navigate(\'/login\')">Login</button></li>';

    return `
        <nav>
            <ul>
                ${renderNavItems(navItems)}
                ${authButton}
            </ul>
        </nav>
        <div id="loading" style="display:none;">Loading...</div>
        <div id="snackbar" class="snackbar"></div>

    `;
}

function setState(newState) {
    Object.assign(state, newState);
    localStorage.setItem("token", state.token);
    renderPage(); // Re-render after state change
}

async function renderPage() {
    const app = document.getElementById("app");
    const path = window.location.pathname;

    app.innerHTML = createNav() + `<div id="content"></div>`;
    const content = document.getElementById("content");

    switch (path) {
        case '/':
            content.innerHTML = `<h1>Welcome to the App<div id="suggested"></div></h1>`;
            displaySuggested();
            break;
        case '/login':
            content.innerHTML = `<div id="auth-section"></div>`;
            displayAuthSection();
            break;
        case '/profile':
            content.innerHTML = `<h1>User Profile</h1><div id="profile-section"></div>`;
            displayProfile();
            break;
        case '/create':
            content.innerHTML = `<h1>Event Creation</h1><div id="create-section"></div>`;
            createEventForm();
            break;
        case '/place':
            content.innerHTML = `<h1>Place Creation</h1><div id="create-place-section"></div>`;
            createPlaceForm();
            break;
        case '/places':
            content.innerHTML = `<h1>Show Places</h1><div id="places"></div>`;
            displayPlaces();
            break;
        case '/events':
            content.innerHTML = `<h1>Show Events</h1><div id="events"></div>`;
            displayEvents();
            break;
        default:
            if (path.startsWith('/user/') && path.length > 6) {
                const username = path.split('/')[2];
                await displayUserProfile(username);
            } else if (path.startsWith('/event/') && path.length > 6) {
                const eventId = path.split('/')[2];
                await displayEvent(eventId);
            } else if (path.startsWith('/place/') && path.length > 6) {
                const placeId = path.split('/')[2];
                await displayPlace(placeId);
            } else {
                content.innerHTML = `<h1>404 Not Found</h1>`;
            }
    }
}

// Function to fetch and display an event by ID
async function displayEvent(eventId) {
    const content = document.getElementById("content");
    try {
        const eventData = await fetchEventData(eventId);
        displayEventDetails(content, eventData);
        await displayTickets(eventId);
        await displayMerchandise(eventId);
        await displayEventMedia(eventId);
    } catch (error) {
        content.innerHTML = `<h1>Error loading event: ${error.message}</h1>`;
    }
}

// Fetch event data
async function fetchEventData(eventId) {
    const eventData = await apiFetch(`/event/${eventId}`);
    if (!eventData || !Array.isArray(eventData.tickets)) {
        throw new Error("Invalid event data received.");
    }
    return eventData;
}

// Display event details
function displayEventDetails(content, eventData) {
    content.innerHTML = `
        <h1>${eventData.title}</h1>
        <p>Date: ${new Date(eventData.date).toLocaleString()}</p>
        <p>Place: <a href="/place/${eventData.place}">${eventData.place}</a></p>
        <p>Location: ${eventData.location}</p>
        <p>Description: ${eventData.description}</p>
        <img src="/eventpic/${eventData.banner_image}" alt="${eventData.title}"/>
        ${state.token ? `
            <button onclick="editEventForm('${eventData.eventid}')">Edit Event</button>
            <button onclick="window.deleteEvent('${eventData.eventid}')">Delete Event</button>
            <button onclick="addTicketForm('${eventData.eventid}')">Add Ticket</button>
            <button onclick="addMerchForm('${eventData.eventid}')">Add Merchandise</button>
            <button onclick="showMediaUploadForm('${eventData.eventid}')">Add Media</button>
        ` : `
            <button onclick="buyTicket('${eventData.eventid}')">Buy Ticket</button>
            <button onclick="buyMerch('${eventData.eventid}')">Buy Merchandise</button>
        `}
        <div id='editevent'></div>
        
        <h2>Available Tickets</h2>
        <ul id="ticket-list"></ul>

        <h2>Available Merchandise</h2>
        <ul id="merch-list"></ul>

        <h2>Event Media</h2>
        <div id="media-list"></div>
    `;
}

// Fetch and display tickets
async function displayTickets(eventId) {
    const ticketData = await apiFetch(`/event/${eventId}/ticket`);
    const ticketList = document.getElementById("ticket-list");
    if (!Array.isArray(ticketData)) {
        throw new Error("Invalid ticket data received.");
    }

    if (ticketData.length > 0) {
        ticketData.forEach(ticket => {
            const ticketItem = document.createElement("li");
            ticketItem.textContent = `${ticket.name} - $${ticket.price.toFixed(2)} (Available: ${ticket.quantity})`;
            ticketList.appendChild(ticketItem);
        });
    } else {
        ticketList.innerHTML = `<li>No tickets available for this event.</li>`;
    }
}

// Fetch and display merchandise
async function displayMerchandise(eventId) {
    const merchData = await apiFetch(`/event/${eventId}/merch`);
    const merchList = document.getElementById("merch-list");
    if (!Array.isArray(merchData)) {
        throw new Error("Invalid merchandise data received.");
    }

    if (merchData.length > 0) {
        merchData.forEach(merch => {
            const merchItem = document.createElement("li");
            merchItem.innerHTML = `
                <img src="/merchpic/${merch.merch_pic}" alt="${merch.name}" style="width: 50px; height: 50px;"/>
                ${merch.name} - $${merch.price.toFixed(2)} (Available: ${merch.quantity})
                ${state.token ? `
                    <button onclick="editMerchForm('${merch.merchid}')">Edit</button>
                    <button onclick="deleteMerch('${merch.merchid}')">Delete</button>
                ` : `
                    <button onclick="buyMerch('${merch.merchid}')">Buy</button>
                `}
            `;
            merchList.appendChild(merchItem);
        });
    } else {
        merchList.innerHTML = `<li>No merchandise available for this event.</li>`;
    }
}

// Fetch and display event media
async function displayEventMedia(eventId) {
    const mediaData = await apiFetch(`/event/${eventId}/media`);
    const mediaList = document.getElementById("media-list");

    if (!Array.isArray(mediaData)) {
        throw new Error("Invalid media data received.");
    }

    if (mediaData.length > 0) {
        mediaData.forEach(media => {
            const mediaItem = document.createElement("div");
            mediaItem.innerHTML = `<h3>${media.caption}</h3><img src="/uploads/${media.url}" alt="${media.caption}" style="width: 100px; height: auto;"/>`;
            mediaList.appendChild(mediaItem);
        });
    } else {
        mediaList.innerHTML = `<p>No media available for this event.</p>`;
    }
}

// Show media upload form
function showMediaUploadForm(eventId) {
    const mediaList = document.getElementById("media-list");
    mediaList.innerHTML = `
        <h3>Upload Event Media</h3>
        <input type="file" id="mediaFile" accept="image/*" />
        <button onclick="uploadMedia('${eventId}')">Upload</button>
    `;
}

// Upload media
async function uploadMedia(eventId) {
    const fileInput = document.getElementById("mediaFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("media", file);

    try {
        await apiFetch(`/event/${eventId}/media`,"POST",formData);
        alert("Media uploaded successfully!");
        // Refresh the media list
        displayEventMedia(eventId);
    } catch (error) {
        alert(`Error uploading media: ${error.message}`);
    }
}

async function buyTicket(ticketId) {
    try {
        const response = await apiFetch(`/ticket/${ticketId}/buy`, 'POST');

        if (response.ok) {
            alert('Ticket purchased successfully!');
            // Optionally, refresh the event display or update UI
            // displayEvent(eventId); // If you have access to eventId
        } else {
            const errorData = await response.json();
            alert(`Failed to purchase ticket: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error purchasing ticket:', error);
        alert('An error occurred while purchasing the ticket.');
    }
}

async function buyMerch(merchId) {
    try {
        const response = await apiFetch(`/merch/${merchId}/buy`, 'POST');

        if (response.ok) {
            alert('Merchandise purchased successfully!');
            // Optionally, refresh the event display or update UI
            // displayEvent(eventId); // If you have access to eventId
        } else {
            const errorData = await response.json();
            alert(`Failed to purchase merchandise: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error purchasing merchandise:', error);
        alert('An error occurred while purchasing the merchandise.');
    }
}
function editMerchForm(merchId) {
    const formHtml = `
        <h3>Edit Merchandise</h3>
        <form id="edit-merch-form">
            <input type="hidden" name="merchid" value="${merchId}" />
            <label for="merchName">Name:</label>
            <input type="text" id="merchName" name="merchName" required />
            <label for="merchPrice">Price:</label>
            <input type="number" id="merchPrice" name="merchPrice" required step="0.01" />
            <label for="merchQuantity">Quantity:</label>
            <input type="number" id="merchQuantity" name="merchQuantity" required />
            <button type="submit">Update Merchandise</button>
        </form>
    `;

    const editDiv = document.getElementById('editevent');
    editDiv.innerHTML = formHtml;

    document.getElementById('edit-merch-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const merchData = Object.fromEntries(formData.entries());

        try {
            const response = await apiFetch(`/merch/${merchId}`, {
                method: 'PUT',
                body: JSON.stringify(merchData),
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            if (response.ok) {
                alert('Merchandise updated successfully!');
                // Optionally, refresh the merchandise list
                // displayEvent(eventId); // If you have access to eventId
            } else {
                const errorData = await response.json();
                alert(`Failed to update merchandise: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error updating merchandise:', error);
            alert('An error occurred while updating the merchandise.');
        }
    });
}


async function deleteMerch(merchId) {
    if (confirm('Are you sure you want to delete this merchandise?')) {
        try {
            const response = await apiFetch(`/merch/${merchId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Merchandise deleted successfully!');
                // Optionally, refresh the event display or update UI
                // displayEvent(eventId); // If you have access to eventId
            } else {
                const errorData = await response.json();
                alert(`Failed to delete merchandise: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error deleting merchandise:', error);
            alert('An error occurred while deleting the merchandise.');
        }
    }
}
async function deleteTicket(ticketId) {
    if (confirm('Are you sure you want to delete this ticket?')) {
        try {
            const response = await apiFetch(`/ticket/${ticketId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Ticket deleted successfully!');
                // Optionally, refresh the event display or update UI
                // displayEvent(eventId); // If you have access to eventId
            } else {
                const errorData = await response.json();
                alert(`Failed to delete ticket: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error deleting ticket:', error);
            alert('An error occurred while deleting the ticket.');
        }
    }
}


// Toggle follow status function
async function toggleFollow(userId) {
    if (!state.token) {
        showSnackbar("Please log in to follow users.");
        return;
    }

    try {
        const data = await apiFetch(`/follows/${userId}`, 'POST');
        const followButton = document.getElementById(`user-${userId}`);
        if (followButton) {
            followButton.textContent = data.isFollowing ? 'Unfollow' : 'Follow';
            followButton.onclick = () => window.toggleFollow(userId); // Update onclick
        }
        showSnackbar(`You have ${data.isFollowing ? 'followed' : 'unfollowed'} the user.`);
    } catch (error) {
        showSnackbar(`Failed to toggle follow status: ${error.message}`);
    }
};

function showSnackbar(message) {
    const snackbar = document.getElementById("snackbar");
    snackbar.textContent = message;
    snackbar.className = "snackbar show";

    // After 3 seconds, remove the show class from the snackbar
    setTimeout(() => {
        snackbar.className = snackbar.className.replace("show", "");
    }, 3000);
}

async function displayUserProfile(username) {
    const userProfile = await fetchUserProfile(username);
    const content = document.getElementById("content");

    if (userProfile) {
        content.innerHTML = renderUserProfile(userProfile);
    } else {
        content.innerHTML = "<p>User not found.</p>";
    }
}

async function deleteProfile() {
    if (!state.token) {
        showSnackbar("Please log in to delete your profile.");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete your profile? This action cannot be undone.");
    if (!confirmDelete) {
        return;
    }

    try {
        await apiFetch('/profile', 'DELETE');
        showSnackbar("Profile deleted successfully.");
        window.logout();
    } catch (error) {
        showSnackbar(`Failed to delete profile: ${error.message}`);
    }
};

async function displayFollowSuggestions() {
    const suggestionsSection = document.getElementById("follow-suggestions");
    try {
        const suggestions = await apiFetch('/follow/suggestions');
        suggestionsSection.innerHTML = "<h3>Suggested Users to Follow:</h3><ul>" +
            suggestions.map(user => `<li>${user.username} <button onclick="navigate('/user/${user.username}')">View Profile</button></li>`).join('') +
            "</ul>";
    } catch (error) {
        suggestionsSection.innerHTML = "<p>Failed to load suggestions.</p>";
    }
}

function displayAuthSection() {
    const authSection = document.getElementById("auth-section");
    if (state.token) {
        authSection.innerHTML = `<h2>Welcome back!</h2>`;
    } else {
        authSection.innerHTML = `
            <h2>Login</h2>
            <input type="text" id="login-username" placeholder="Username" />
            <input type="password" id="login-password" placeholder="Password" />
            <button onclick="window.login()">Login</button>

            <h2>Signup</h2>
            <input type="text" id="signup-username" placeholder="Username" />
            <input type="email" id="signup-email" placeholder="Email" />
            <input type="password" id="signup-password" placeholder="Password" />
            <button onclick="window.signup()">Signup</button>
        `;
    }
}

// Utility function to escape HTML to prevent XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

async function login() {
    const username = escapeHTML(document.getElementById("login-username").value.trim());
    const password = escapeHTML(document.getElementById("login-password").value);

    const errors = validateInputs([
        { value: username, validator: isValidUsername, message: "Username must be between 3 and 20 characters." },
        { value: password, validator: val => !!val, message: "Please enter a password." },
    ]);

    if (errors) {
        handleError(errors);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const res = await response.json();
        if (response.ok) {
            state.token = res.data.token;
            localStorage.setItem("token", state.token);
            navigate('/');
            renderPage();
        } else {
            handleError(res.message);
        }
    } catch (error) {
        handleError("Error logging in.");
    }
};

async function signup() {
    const username = escapeHTML(document.getElementById("signup-username").value.trim());
    const email = escapeHTML(document.getElementById("signup-email").value.trim());
    const password = escapeHTML(document.getElementById("signup-password").value);

    const errors = validateInputs([
        { value: username, validator: isValidUsername, message: "Username must be between 3 and 20 characters." },
        { value: email, validator: isValidEmail, message: "Please enter a valid email." },
        { value: password, validator: isValidPassword, message: "Password must be at least 6 characters long." },
    ]);

    if (errors) {
        handleError(errors);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            showSnackbar("Signup successful! You can now log in.");
            navigate('/login');
            renderPage();
        } else {
            handleError(data.message);
        }
    } catch (error) {
        handleError("Error signing up.");
    }
};

async function logout() {
    state.token = null;
    state.userProfile = null; // Clear userProfile from state
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile"); // Remove cached profile from localStorage
    renderPage(); // Re-render the page
};

async function editProfile() {
    const profileSection = document.getElementById("profile-section");

    if (state.userProfile) {
        const profilePictureSrc = state.userProfile.profile_picture ? `/userpic/${state.userProfile.profile_picture}` : '';

        profileSection.innerHTML = `
            <h2>Edit Profile</h2>
            <input type="text" id="edit-username" placeholder="Username" value="${state.userProfile.username}" />
            <input type="email" id="edit-email" placeholder="Email" value="${state.userProfile.email}" />
            <input type="text" id="edit-bio" placeholder="Bio" value="${state.userProfile.bio || ''}" />
            <input type="text" id="edit-phone" placeholder="Phone Number" value="${state.userProfile.phone_number || ''}" />
            <input type="text" id="edit-social" placeholder="Social Links (comma-separated)" value="${state.userProfile.socialLinks ? Object.values(state.userProfile.socialLinks).join(', ') : ''}" />
            <input type="file" id="edit-profile-picture" accept="image/*" onchange="previewProfilePicture(event)" />
            ${profilePictureSrc ? `
                <div>
                    <p>Current Profile Picture:</p>
                    <img id="current-profile-picture" src="${profilePictureSrc}" style="max-width: 200px;" alt="Current Profile Picture" />
                </div>
                <img id="profile-picture-preview" style="display:none; max-width: 200px;" alt="Profile Picture Preview" />
            ` : '<img id="profile-picture-preview" style="display:none;" />'}
            <button onclick="window.updateProfile()">Update Profile</button>
            <button onclick="renderPage()">Cancel</button>
        `;
    } else {
        showSnackbar("Please log in to edit your profile.");
    }
};

async function updateProfile() {
    if (!state.token) {
        showSnackbar("Please log in to update your profile.");
        return;
    }
    const profileSection = document.getElementById("profile-section");
    const newUsername = document.getElementById("edit-username").value.trim();
    const newEmail = document.getElementById("edit-email").value.trim();
    const newBio = document.getElementById("edit-bio").value.trim();
    const newPhone = document.getElementById("edit-phone").value.trim();
    const newSocialLinks = document.getElementById("edit-social").value.split(',').map(link => link.trim());
    const profilePictureFile = document.getElementById("edit-profile-picture").files[0];

    const errors = validateInputs([
        { value: newUsername, validator: isValidUsername, message: "Username must be between 3 and 20 characters." },
        { value: newEmail, validator: isValidEmail, message: "Please enter a valid email." }
    ]);

    if (errors) {
        handleError(errors);
        return;
    }

    profileSection.innerHTML += `<p>Updating...</p>`;

    if (state.token) {
        try {
            const formData = new FormData();
            formData.append("username", newUsername);
            formData.append("email", newEmail);
            formData.append("bio", newBio);
            formData.append("phone_number", newPhone);
            formData.append("social_links", JSON.stringify(newSocialLinks));
            if (profilePictureFile) {
                formData.append("profile_picture", profilePictureFile);
            }

            const response = await fetch(`${API_URL}/profile`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${state.token}`,
                },
                body: formData,
            });

            if (response.ok || response.status === 204) {
                if (response.status !== 204) {
                    const updatedProfile = await response.json();
                    state.userProfile = updatedProfile;
                    localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
                }
                showSnackbar("Profile updated successfully.");
                renderPage();
            } else {
                const errorData = await response.json();
                handleError(errorData.error);
            }
        } catch (error) {
            handleError("Error updating profile.");
        } finally {
            const loadingMsg = profileSection.querySelector("p");
            if (loadingMsg) loadingMsg.remove();
        }
        window.logActivity("updated profile");
    } else {
        handleError("Please log in to update your profile.");
    }
};

async function createOrUpdatePlace(placeId = null) {
    const name = document.getElementById("place-name").value.trim();
    const address = document.getElementById("place-address").value.trim();
    const description = document.getElementById("place-description").value.trim();
    const bannerFile = document.getElementById("place-banner").files[0];

    const errors = validateInputs([
        { value: name, validator: val => !!val, message: "Place name is required." },
        { value: address, validator: val => !!val, message: "Address is required." },
        { value: description, validator: val => !!val, message: "Description is required." }
    ]);

    if (errors) {
        handleError(errors);
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('address', address);
    formData.append('description', description);
    if (bannerFile) {
        formData.append('banner', bannerFile);
    }

    const method = placeId ? 'PUT' : 'POST';
    const url = placeId ? `${API_URL}/place/${placeId}` : `${API_URL}/place`;

    try {
        const result = await apiFetch(url, method, formData);
        showSnackbar(`Place ${placeId ? 'updated' : 'created'} successfully: ${result.name}`);
        navigate('/place/' + result.placeid);
    } catch (error) {
        handleError(`Error ${placeId ? 'updating' : 'creating'} place: ${error.message}`);
    }
}

function generatePlaceHTML(place) {
    return `
        <div class="place">
            <h1><a href="/place/${place.placeid}">${place.name}</a></h1>
            <img src="/placepic/${place.banner}" alt="${place.name} Banner" style="width: 100%; max-height: 300px; object-fit: cover;" />
            <p><strong>Address:</strong> ${place.address}</p>
            <p><strong>Description:</strong> ${place.description}</p>
            <button onclick="editPlaceForm('${place.placeid}')">Edit Place</button>
            <button onclick="window.deletePlace('${place.placeid}')">Delete Place</button>
            <div id='editplace'></div>
        </div>
        <hr />
    `;
}

function generateEventHTML(event) {
    return `
        <div class="event">
            <h1><a href="/event/${event.eventid}">${event.title}</a></h1>
            <img src="/eventpic/${event.banner_image}" alt="${event.title} Banner" style="width: 100%; max-height: 300px; object-fit: cover;" />
            <p>Place: <a href="/place/${event.place}">${event.place}</a></p>
            <p><strong>Address:</strong> ${event.location}</p>
            <p><strong>Description:</strong> ${event.description}</p>
            <div id='editevent'></div>
        </div>
        <hr />
    `;
}

async function displayPlaces() {
    const content = document.getElementById("places");

    try {
        const places = await fetchPlaces();
        content.innerHTML = places.length
            ? places.map(generatePlaceHTML).join('')
            : "<h2>No places available.</h2>";
    } catch (error) {
        handleError("Error fetching places.");
    }
}

async function displaySuggested() {
    const content = document.getElementById("suggested");

    try {
        const places = await fetchPlaces();
        content.innerHTML = places.length
            ? places.map(generatePlaceHTML).join('')
            : "<h2>No places available.</h2>";
    } catch (error) {
        handleError("Error fetching places.");
    }
}

async function displayEvents() {
    const content = document.getElementById("events");

    const events = await fetchEvents(); // Fetch the events

    if (events === null) {
        // Handle the error case if fetchEvents failed
        handleError("Could not load events. Please try again later.");
        return; // Exit the function to prevent further execution
    }

    // Populate the content based on the fetched events
    content.innerHTML = events.length
        ? events.map(generateEventHTML).join('')
        : "<h2>No events available.</h2>";
}

function previewProfilePicture(event) {
    const preview = document.getElementById("profile-picture-preview");
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = "block"; // Show the preview of the new image
            }
        };
        reader.readAsDataURL(file);
    } else {
        if (preview) {
            preview.style.display = "none"; // Hide the preview if no file is selected
        }
    }
};

// Display activity feed
async function displayActivityFeed() {
    const activityFeed = document.getElementById("activity-feed");

    try {
        const activities = await apiFetch('/activity');
        activityFeed.innerHTML = activities.length > 0
            ? "<h3>Recent Activities:</h3><ul>" +
            activities.map(activity => `<li>${activity.action} - ${new Date(activity.timestamp).toLocaleString()}</li>`).join('') +
            "</ul>"
            : "<p>No recent activities.</p>";
    } catch (error) {
        activityFeed.innerHTML = "<p>Error loading activities.</p>";
    }
}

let activityAbortController;

async function logActivity(activityDescription) {
    if (!state.token) {
        showSnackbar("Please log in to log activities.");
        return;
    }

    const activity = {
        action: activityDescription,
        timestamp: new Date().toISOString()
    };

    // Abort the previous logActivity fetch if it's still ongoing
    if (activityAbortController) {
        activityAbortController.abort();
    }

    activityAbortController = new AbortController(); // Create a new instance
    const signal = activityAbortController.signal; // Get the signal to pass to fetch

    try {
        await apiFetch('/activity', 'POST', activity, { signal });
        showSnackbar("Activity logged successfully.");
    } catch (error) {
        // Check if the error is due to an abort
        if (error.name === 'AbortError') {
            console.log('Activity log aborted');
            return; // Do nothing for aborted fetch
        }
        console.error(`Failed to log activity: ${error}`);
        if (error.message === 'Unknown error') {
            showSnackbar("Failed to log activity: Invalid data.");
        } else {
            showSnackbar(`Failed to log activity: ${error.message}`);
        }
    }
};

async function apiFetch(endpoint, method = "GET", body = null, options = {}) {
    document.getElementById('loading').style.display = 'block';

    const fetchOptions = {
        method,
        headers: {
            "Authorization": `Bearer ${state.token}`,
            // Do not set Content-Type for FormData
        },
        body: body || undefined,
        signal: options.signal, // Include the signal for aborting
    };

    // If the body is FormData, remove Content-Type header
    if (body instanceof FormData) {
        delete fetchOptions.headers['Content-Type'];
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);
        if (response.ok) {
            const text = await response.text(); // Get response as text
            return text ? JSON.parse(text) : null; // Parse JSON if there's content
        } else {
            const errorData = await response.text(); // Get error message as text
            throw new Error(errorData || 'Unknown error');
        }
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error; // Rethrow for further handling
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// async function createPlaceForm() {
//     const createSection = document.getElementById("create-place-section");
//     if (state.token) {
//         createSection.innerHTML = `
//             <h2>Create Place</h2>
//             <input type="text" id="place-name" placeholder="Place Name" required />
//             <input type="text" id="place-address" placeholder="Address" required />
//             <textarea id="place-description" placeholder="Description" required></textarea>
//             <input type="file" id="place-banner" accept="image/*" />
//             <button onclick="window.createPlace()">Create Place</button>
//         `;
//     } else {
//         navigate('/login');
//     }
// }

async function createPlace() {
    if (!state.token) {
        showSnackbar("Please log in to create place.");
        return;
    }
    const name = document.getElementById("place-name").value.trim();
    const address = document.getElementById("place-address").value.trim();
    const description = document.getElementById("place-description").value.trim();
    const bannerFile = document.getElementById("place-banner").files[0];

    if (!name || !address || !description) {
        showSnackbar("Please fill in all fields.");
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('address', address);
    formData.append('description', description);
    if (bannerFile) {
        formData.append('banner', bannerFile);
    }

    try {
        const result = await apiFetch('/place', 'POST', formData);
        showSnackbar(`Place created successfully: ${result.name}`);
        navigate('/place/' + result.placeid);
    } catch (error) {
        showSnackbar(`Error creating place: ${error.message}`);
    }
};

async function editPlaceForm(placeId) {
    const createSection = document.getElementById("editplace");
    if (state.token) {
        const place = await apiFetch(`/place/${placeId}`);
        createSection.innerHTML = `
            <h2>Edit Place</h2>
            <input type="text" id="place-name" value="${place.name}" placeholder="Place Name" required />
            <input type="text" id="place-address" value="${place.address}" placeholder="Address" required />
            <textarea id="place-description" placeholder="Description" required>${place.description}</textarea>
            <input type="file" id="place-banner" accept="image/*" />
            <button onclick="window.updatePlace('${placeId}')">Update Place</button>
        `;
    } else {
        navigate('/login');
    }
}

async function editEventForm(eventId) {
    const createSection = document.getElementById("editevent");
    if (state.token) {
        try {
            const event = await apiFetch(`/event/${eventId}`);
            createSection.innerHTML = `
                <h2>Edit Event</h2>
                <input type="text" id="event-title" value="${event.title}" placeholder="Event Title" required />
                <input type="date" id="event-date" value="${new Date(event.date).toISOString().split('T')[0]}" required />
                <input type="time" id="event-time" value="${new Date(event.date).toISOString().split('T')[1].slice(0, 5)}" required />
                <input type="text" id="event-location" value="${event.location}" placeholder="Location" required />
                <input type="text" id="event-place" value="${event.place}" placeholder="Place" required />
                <textarea id="event-description" placeholder="Description" required>${event.description}</textarea>
                <input type="file" id="event-banner" accept="image/*" />
                <button onclick="window.updateEvent('${eventId}')">Update Event</button>
            `;
        } catch (error) {
            showSnackbar(`Error loading event: ${error.message}`);
        }
    } else {
        navigate('/login');
    }
};

async function updatePlace(placeId) {
    if (!state.token) {
        showSnackbar("Please log in to update place.");
        return;
    }
    const name = document.getElementById("place-name").value.trim();
    const address = document.getElementById("place-address").value.trim();
    const description = document.getElementById("place-description").value.trim();
    const bannerFile = document.getElementById("place-banner").files[0];

    if (!name || !address || !description) {
        showSnackbar("Please fill in all fields.");
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('address', address);
    formData.append('description', description);
    if (bannerFile) {
        formData.append('banner', bannerFile);
    }

    try {
        const result = await apiFetch(`/place/${placeId}`, 'PUT', formData);
        showSnackbar(`Place updated successfully: ${result.name}`);
        navigate('/place/' + result.placeid);
    } catch (error) {
        showSnackbar(`Error updating place: ${error.message}`);
    }
};

// async function displayPlace(placeId) {
//     const content = document.getElementById("content");

//     try {
//         const place = await apiFetch(`/place/${placeId}`);
//         content.innerHTML = `
//             <h1>${place.name}</h1>
//             <img src="/placepic/${place.banner}" alt="${place.name} Banner" style="width: 100%; max-height: 300px; object-fit: cover;" />
//             <p><strong>Address:</strong> ${place.address}</p>
//             <p><strong>Description:</strong> ${place.description}</p>
//             <button onclick="editPlaceForm('${place.placeid}')">Edit Place</button>
//             <button onclick="window.deletePlace('${place.placeid}')">Delete Place</button>
//             <div id='editplace'></div>
//         `;
//     } catch (error) {
//         content.innerHTML = `<h2>Error fetching place details: ${error.message}</h2>`;
//     }
// }


async function displayPlace(placeId) {
    const content = document.getElementById("content");

    try {
        const place = await apiFetch(`/place/${placeId}`);
        // Construct the place display
        content.innerHTML = `
            <h1>${place.name}</h1>
            <img src="/placepic/${place.banner}" alt="${place.name} Banner" style="width: 100%; max-height: 300px; object-fit: cover;" />
            <p><strong>Address:</strong> ${place.address}</p>
            <p><strong>Description:</strong> ${place.description}</p>
            <p><strong>Capacity:</strong> ${place.capacity > 0 ? place.capacity : "Not specified"}</p>
            <p><strong>Category:</strong> ${place.category ? place.category.name : "Not specified"}</p>

            <button onclick="editPlaceForm('${place.placeid}')">Edit Place</button>
            <button onclick="window.deletePlace('${place.placeid}')">Delete Place</button>
            <div id='editplace'></div>
        `;
    } catch (error) {
        content.innerHTML = `<h2>Error fetching place details: ${error.message}</h2>`;
    }
}

// async function displayPlace(placeId) {
//     const content = document.getElementById("content");

//     try {
//         const place = await apiFetch(`/place/${placeId}`);

//         // Prepare accessibility features list
//         const accessibilityFeatures = [
//             { feature: "Wheelchair Accessible", value: place.accessibility.wheelchair_accessible },
//             // { feature: "Accessible Restrooms", value: place.accessibility.accessible_restrooms },
//             // { feature: "Sign Language Interpreters", value: place.accessibility.sign_language_interpreters },
//             // { feature: "Assistive Listening Devices", value: place.accessibility.assistive_listening_devices },
//             // { feature: "Braille Materials", value: place.accessibility.braille_materials },
//             // { feature: "Visual Assistance", value: place.accessibility.visual_assistance },
//             // { feature: "Emergency Procedures", value: place.accessibility.emergency_procedures },
//             // { feature: "Service Animal Policy", value: place.accessibility.service_animal_policy },
//             // { feature: "Seating Options", value: place.accessibility.seating_options },
//             // { feature: "Sensory Friendly", value: place.accessibility.sensory_friendly },
//             // { feature: "Staff Trained in Accessibility", value: place.accessibility.staff_trained_in_a11y },
//         ];

//         // Construct the place display
//         content.innerHTML = `
//             <h1>${place.name}</h1>
//             <img src="/placepic/${place.banner}" alt="${place.name} Banner" style="width: 100%; max-height: 300px; object-fit: cover;" />
//             <p><strong>Address:</strong> ${place.address}</p>
//             <p><strong>Description:</strong> ${place.description}</p>
//             <p><strong>Capacity:</strong> ${place.capacity > 0 ? place.capacity : "Not specified"}</p>
//             <p><strong>Category:</strong> ${place.category ? place.category.name : "Not specified"}</p>

//             <h3>Accessibility Features:</h3>
//             <ul>
//                 ${accessibilityFeatures.map(feature => `
//                     <li><strong>${feature.feature}:</strong> ${feature.value ? "Yes" : "No"}</li>
//                 `).join('')}
//             </ul>

//             <button onclick="editPlaceForm('${place.placeid}')">Edit Place</button>
//             <button onclick="window.deletePlace('${place.placeid}')">Delete Place</button>
//             <div id='editplace'></div>
//         `;
//     } catch (error) {
//         content.innerHTML = `<h2>Error fetching place details: ${error.message}</h2>`;
//     }
// }


async function deletePlace(placeId) {
    if (!state.token) {
        showSnackbar("Please log in to delete your place.");
        return;
    }
    if (confirm("Are you sure you want to delete this place?")) {
        try {
            await apiFetch(`/place/${placeId}`, 'DELETE');
            showSnackbar("Place deleted successfully.");
            navigate('/'); // Redirect to home or another page
        } catch (error) {
            showSnackbar(`Error deleting place: ${error.message}`);
        }
    }
};

async function deleteEvent(eventId) {
    if (!state.token) {
        showSnackbar("Please log in to delete your event.");
        return;
    }
    if (confirm("Are you sure you want to delete this event?")) {
        try {
            await apiFetch(`/event/${eventId}`, 'DELETE');
            showSnackbar("Event deleted successfully.");
            navigate('/'); // Redirect to home or another page
        } catch (error) {
            showSnackbar(`Error deleting event: ${error.message}`);
        }
    }
};


function addTicketForm(eventId) {
    const editEventDiv = document.getElementById('editevent');
    editEventDiv.innerHTML = `
        <h3>Add Ticket</h3>
        <input type="text" id="ticket-name" placeholder="Ticket Name" required />
        <input type="number" id="ticket-price" placeholder="Ticket Price" required />
        <input type="number" id="ticket-quantity" placeholder="Quantity Available" required />
        <button onclick="addTicket('${eventId}')">Add Ticket</button>
        <button onclick="clearTicketForm()">Cancel</button>
    `;
}


async function addTicket(eventId) {
    const tickName = document.getElementById('ticket-name').value.trim();
    const tickPrice = parseFloat(document.getElementById('ticket-price').value);
    const tickQuantity = parseInt(document.getElementById('ticket-quantity').value);

    if (!tickName || isNaN(tickPrice) || isNaN(tickQuantity)) {
        alert("Please fill in all fields correctly.");
        return;
    }

    const formData = new FormData();
    formData.append('eventId', eventId);
    formData.append('name', tickName);
    formData.append('price', tickPrice);
    formData.append('quantity', tickQuantity);

    try {
        await apiFetch(`/event/${eventId}/ticket`, 'POST', formData);
        alert("Ticket added successfully!");
        clearTicketForm();
        displayEvent(eventId); // Refresh the event display
    } catch (error) {
        alert(`Error adding ticket: ${error.message}`);
    }
}

// async function addTicket(eventId) {
//     const ticketName = document.getElementById('ticket-name').value.trim();
//     const ticketPrice = parseFloat(document.getElementById('ticket-price').value);
//     const ticketQuantity = parseInt(document.getElementById('ticket-quantity').value);

//     if (!ticketName || isNaN(ticketPrice) || isNaN(ticketQuantity)) {
//         alert("Please fill in all fields correctly.");
//         return;
//     }

//     const ticketData = {
//         eventId,
//         name: ticketName,
//         price: ticketPrice,
//         quantity: ticketQuantity
//     };

//     try {
//         await apiFetch(`/event/${eventId}/ticket`, 'POST', JSON.stringify(ticketData), {
//             'Content-Type': 'application/json'
//         });
//         alert("Ticket added successfully!");
//         clearTicketForm();
//         displayEvent(eventId); // Refresh the event display
//     } catch (error) {
//         alert(`Error adding ticket: ${error.message}`);
//     }
// }

function clearTicketForm() {
    document.getElementById('editevent').innerHTML = '';
}


function addMerchForm(eventId) {
    const editEventDiv = document.getElementById('editevent');
    editEventDiv.innerHTML = `
        <h3>Add Merchandise</h3>
        <input type="text" id="merch-name" placeholder="Merchandise Name" required />
        <input type="number" id="merch-price" placeholder="Price" required />
        <input type="number" id="merch-quantity" placeholder="Quantity Available" required />
        <input type="file" id="merch-image" accept="image/*" />
        <button onclick="addMerchandise('${eventId}')">Add Merchandise</button>
        <button onclick="clearMerchForm()">Cancel</button>
    `;
}

async function addMerchandise(eventId) {
    const merchName = document.getElementById('merch-name').value.trim();
    const merchPrice = parseFloat(document.getElementById('merch-price').value);
    const merchQuantity = parseInt(document.getElementById('merch-quantity').value);
    const merchImageFile = document.getElementById('merch-image').files[0];

    if (!merchName || isNaN(merchPrice) || isNaN(merchQuantity)) {
        alert("Please fill in all fields correctly.");
        return;
    }

    const formData = new FormData();
    formData.append('eventId', eventId);
    formData.append('name', merchName);
    formData.append('price', merchPrice);
    formData.append('quantity', merchQuantity);

    if (merchImageFile) {
        formData.append('image', merchImageFile);
    }

    try {
        await apiFetch(`/event/${eventId}/merch`, 'POST', formData);
        alert("Merchandise added successfully!");
        clearMerchForm();
        displayEvent(eventId); // Refresh the event display
    } catch (error) {
        alert(`Error adding merchandise: ${error.message}`);
    }
}

function clearMerchForm() {
    document.getElementById('editevent').innerHTML = '';
}


// Assign functions directly to the window object
window.navigate = navigate;
window.addTicketForm = addTicketForm;
window.addTicket = addTicket;
window.clearTicketForm = clearTicketForm;
window.addMerchForm = addMerchForm;
window.editMerchForm = editMerchForm;
window.deleteMerch = deleteMerch;
window.addMerchandise = addMerchandise;
window.clearMerchForm = clearMerchForm;
window.editPlaceForm = editPlaceForm;
window.deletePlace = deletePlace;
window.createPlace = createPlace;
window.toggleFollow = toggleFollow;
window.deleteProfile = deleteProfile;
window.editProfile = editProfile;
window.updateProfile = updateProfile;
window.updatePlace = updatePlace;
window.previewProfilePicture = previewProfilePicture;
window.logActivity = logActivity;
window.login = login;
window.signup = signup;
window.logout = logout;
window.renderPage = renderPage;
window.deleteEvent = deleteEvent;
window.editEventForm = editEventForm;
window.updateEvent = updateEvent;
window.createEvent = createEvent;
window.buyTicket = buyTicket
window.buyMerch = buyMerch
window.editMerchForm = editMerchForm
window.deleteMerch = deleteMerch
window.deleteTicket = deleteTicket
window.showMediaUploadForm = showMediaUploadForm
window.uploadMedia = uploadMedia

// Start the app
init();
