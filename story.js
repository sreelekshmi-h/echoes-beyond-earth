
(() => {

    async function loadStory() {

        const params = new URLSearchParams(window.location.search);
        const equipmentId = params.get("id");

        if (!equipmentId) {
            showError();
            return;
        }

        try {

            const [moonResponse, marsResponse] = await Promise.all([
                fetch("data/moon.json"),
                fetch("data/mars.json")
            ]);

            if (!moonResponse.ok || !marsResponse.ok) {
                throw new Error("Could not load equipment data.");
            }

            const moonData = await moonResponse.json();
            const marsData = await marsResponse.json();

            const equipment = [
                ...moonData.map(item => ({
                    ...item,
                    world: "The Moon",
                    worldKey: "moon"
                })),

                ...marsData.map(item => ({
                    ...item,
                    world: "Mars",
                    worldKey: "mars"
                }))
            ];

            const selected = equipment.find(
                item => item.id === equipmentId
            );

            if (!selected) {
                showError();
                return;
            }

            displayStory(selected);

        } catch (error) {

            console.error(error);
            showError();

        }
    }

    function displayStory(item) {

        document.title = `${item.name} | Echoes Beyond Earth`;

        const backLink = document.querySelector(".back-link");

        if (backLink) {
            backLink.href = `explore.html#${item.worldKey}-equipment`;
        }

        document.getElementById("story-title").textContent =
            item.name;

        document.getElementById("story-location").textContent =
            item.where;

        document.getElementById("story-text").textContent =
            item.story;

        document.getElementById("story-status").textContent =
            item.status;

        document.getElementById("story-year").textContent =
            `Mission year: ${item.year}`;

        document.getElementById("story-world").textContent =
            `Location: ${item.world}`;

        const image = document.getElementById("story-image");

        if (item.image) {
            image.src = item.image;
            image.alt = item.name;
            image.hidden = false;
        } else {
            image.hidden = true;
        }

        image.onerror = () => {
            image.hidden = true;
        };

        const source = document.getElementById("story-source");

        if (item.source) {
            source.href = item.source;
            source.hidden = false;
        } else {
            source.hidden = true;
        }
    }

    function showError() {

        document.title = "Story Not Found | Echoes Beyond Earth";

        document.getElementById("story-title").textContent =
            "Story not found";

        document.getElementById("story-location").textContent =
            "We couldn't find this mission.";

        document.getElementById("story-text").textContent =
            "Please return to the Explore page and select an equipment entry.";

        document.getElementById("story-status").textContent = "";

        document.getElementById("story-image").hidden = true;

        document.getElementById("story-source").hidden = true;
    }

    loadStory();

})();
