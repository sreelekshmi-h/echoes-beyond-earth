
(() => {

    async function loadEquipment() {
        const moonList = document.getElementById("moon-cards");
        const marsList = document.getElementById("mars-cards");

        try {
            const [moonResponse, marsResponse] = await Promise.all([
                fetch("data/moon.json"),
                fetch("data/mars.json")
            ]);

            if (!moonResponse.ok || !marsResponse.ok) {
                throw new Error("Could not load equipment files.");
            }

            const moonData = await moonResponse.json();
            const marsData = await marsResponse.json();

            build("moon", moonData);
            build("mars", marsData);

        } catch (error) {
            console.error(error);

            if (moonList) {
                moonList.textContent = "Unable to load Moon equipment.";
            }

            if (marsList) {
                marsList.textContent = "Unable to load Mars equipment.";
            }
        }
    }

    function el(tag, cls, text) {
        const node = document.createElement(tag);

        if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text;

        return node;
    }

    function createImage(item, className) {
        const img = el("img", className);

        img.alt = item.name;
        img.loading = "lazy";

        if (item.image) {
            img.src = item.image;
        } else {
            img.classList.add("image-placeholder");
        }

        img.onerror = () => {
            img.removeAttribute("src");
            img.classList.add("image-placeholder");
        };

        return img;
    }

    function build(world, items) {
        const list = document.getElementById(world + "-cards");

        if (!list) return;

        list.innerHTML = "";

        items.forEach(item => {

            const card = el("article", "machine");

            // Make the equipment card clickable
            const link = el("a", "machine-link");
            link.href = `story.html?id=${encodeURIComponent(item.id)}`;
            link.setAttribute(
                "aria-label",
                `Read the story of ${item.name}`
            );

            // Equipment heading
            const summary = el("div", "machine-summary");

            const thumbnail = createImage(item, "machine-image");

            const info = el("div", "machine-info");

            info.append(
                el("span", "m-name", item.name),
                el("span", "m-where", item.where),
                el("span", "m-year", String(item.year))
            );

            summary.append(thumbnail, info);

            link.append(summary);
            card.append(link);
            list.append(card);

        });

        // Update equipment counts
        const years = items
            .map(item => Number(item.year))
            .filter(Number.isFinite);

        const note = document.querySelector(
            `[data-note="${world}"]`
        );

        const count = document.querySelector(
            `[data-count="${world}"]`
        );

        if (note && years.length) {
            note.textContent =
                `${items.length} machines, landed between ${Math.min(...years)} and ${Math.max(...years)}.`;
        }

        if (count) {
            count.textContent = `${items.length} machines`;
        }
    }

    loadEquipment();

})();
