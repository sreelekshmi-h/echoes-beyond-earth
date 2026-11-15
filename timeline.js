
(() => {

    let allMissions = [];

    async function loadTimeline() {

        const timeline = document.getElementById("timeline-list");

        try {

            const [moonResponse, marsResponse] = await Promise.all([
                fetch("data/moon.json"),
                fetch("data/mars.json")
            ]);

            if (!moonResponse.ok || !marsResponse.ok) {
                throw new Error("Could not load mission data.");
            }

            const moonData = await moonResponse.json();
            const marsData = await marsResponse.json();

            allMissions = [
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

            allMissions.sort(
                (a, b) => Number(a.year) - Number(b.year)
            );

            displayTimeline(allMissions);

            setupFilters();

        } catch (error) {

            console.error(error);

            timeline.textContent =
                "Unable to load the mission timeline.";

        }
    }

    function displayTimeline(missions) {

        const timeline = document.getElementById("timeline-list");

        timeline.innerHTML = "";

        if (missions.length === 0) {
            timeline.textContent = "No missions found.";
            return;
        }

        missions.forEach(mission => {

            const entry = document.createElement("a");

            entry.className = "timeline-entry";

            entry.href =
                `story.html?id=${encodeURIComponent(mission.id)}`;

            const year = document.createElement("span");
            year.className = "timeline-year";
            year.textContent = mission.year;

            const content = document.createElement("div");
            content.className = "timeline-content";

            const name = document.createElement("h2");
            name.textContent = mission.name;

            const world = document.createElement("p");
            world.textContent = mission.world;

            const location = document.createElement("p");
            location.textContent = mission.where;

            content.append(name, world, location);

            entry.append(year, content);

            timeline.append(entry);

        });

    }

    function setupFilters() {

        const buttons = document.querySelectorAll(".filter-btn");

        buttons.forEach(button => {

            button.addEventListener("click", () => {

                buttons.forEach(btn =>
                    btn.classList.remove("active")
                );

                button.classList.add("active");

                const filter = button.dataset.filter;

                if (filter === "all") {

                    displayTimeline(allMissions);

                } else {

                    const filteredMissions = allMissions.filter(
                        mission => mission.worldKey === filter
                    );

                    displayTimeline(filteredMissions);

                }

            });

        });

    }

    loadTimeline();

})();
