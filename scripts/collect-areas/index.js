const fs = require('node:fs');
const path = require('node:path');

const areaslist = require('./areas.json');

function main() {
    const citiesById = new Map();
    const areasById = new Map();

    const outputDir = path.join(__dirname, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    for (const area of areaslist) {
        if (!area || !Array.isArray(area.fields)) continue;

        const cityField = area.fields.find(field => field?.attribute === 'city.name');
        const areaField = area.fields.find(field => field?.attribute === 'name');
        if (!cityField || !areaField) continue;

        const cityId = cityField.resource_id;
        const areaId = areaField.resource_id;
        if (cityId == null || areaId == null) continue;

        if (!citiesById.has(cityId)) {
            citiesById.set(cityId, {
                providerCityId: cityId,
                provider: 'optimus',
                name: cityField.value,
            });
        }

        if (!areasById.has(areaId)) {
            areasById.set(areaId, {
                providerAreaId: areaId,
                provider: 'optimus',
                name: areaField.value,
                providerCityId: cityId,
            });
        }
    }

    const cities = [...citiesById.values()];
    const areas = [...areasById.values()];

    fs.writeFileSync(path.join(outputDir, 'cities.json'), JSON.stringify(cities, null, 2));
    fs.writeFileSync(path.join(outputDir, 'areas.json'), JSON.stringify(areas, null, 2));

    console.log(`Wrote ${cities.length} cities and ${areas.length} areas to ${outputDir}`);
}

main();