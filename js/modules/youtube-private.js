export async function fetchMyPlaylists() {
    try {
        const token = window.MuseSound.state.googleToken;
        if (!token) throw new Error("Authentification requise");

        const response = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            // Token expiré → tentative de refresh
            const newToken = await window.MuseSound.refreshGoogleToken();
            if (newToken) {
                const retry = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50", {
                    headers: {
                        "Authorization": `Bearer ${newToken}`,
                        "Accept": "application/json"
                    }
                });
                if (retry.ok) {
                    const data = await retry.json();
                    return data.items;
                }
            }
            throw new Error("Session expirée, veuillez vous reconnecter.");
        }

        if (!response.ok) throw new Error("Impossible de charger les playlists");

        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error(error);
        window.MuseSound.showToast("Erreur lors du chargement de la bibliothèque: " + error.message);
        return [];
    }
}