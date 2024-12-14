import * as I from "./import.js";
import { ProjectExplorer, ProjectManager } from "./explorer.js";
import { OPTIONS } from "./config.js";
import { Database } from "./db.js";
import { MyScene } from "./scene.js";
import * as U from "./utils.js";
import { SceneInteraction } from "./interactive.js";
import * as MAT from "./materials.js";
import { NavigationBar } from "./navbar.js";
import { SurveyHelper } from "./survey.js";
import { SurveyEditor } from "./surveyeditor.js";
import { addGui } from "./gui.js";

let gui;
let db = new Database()
let explorer, manager, myscene, navbar, surveyeditor;

let cavesStationNamesGroup;

init();
myscene.renderScene();

function init() {

    if (document.addEventListener) {
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        }, false);
    } else {
        document.attachEvent('oncontextmenu', function () {
            window.event.returnValue = false;
        });
    }

    cavesStationNamesGroup = [];

    myscene = new MyScene(OPTIONS);
    navbar = new NavigationBar(document.getElementById("navbarcontainer"), OPTIONS, myscene);
    surveyeditor = new SurveyEditor(myscene, db, document.getElementById("surveydatapanel"), document.getElementById("surveydatapanel-close"), document.getElementById("surveydatapanel-update"));
    explorer = new ProjectExplorer(OPTIONS, db, myscene, surveyeditor);
    manager = new ProjectManager(db, myscene, explorer);

    gui = addGui(OPTIONS, myscene, MAT.materials, document.getElementById( 'guicontrols' ));
    let interaction = new SceneInteraction(myscene, MAT.materials, myscene.domElement, document.getElementById("getdistance"), document.getElementById("contextmenu"), document.getElementById("infopanel"));

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('cave')) {
        const caveNameUrl = urlParams.get('cave');

        if (caveNameUrl.includes('.cave')) {
            fetch(caveNameUrl).then(data => data.blob()).then(res => imporPolygonFromFile(res)).catch(error => console.error(error));
        }
    }
}

function imporPolygonFromFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => importPolygon(event.target.result);
    reader.readAsText(file, "iso_8859-2");
}

function importPolygon(wholeFileInText) {
    const cave = I.getCaveFromPolygonFile(wholeFileInText);
    addCave(cave);
}

function addCave(cave) {
    db.caves.set(cave.name, cave);
    cave.surveys.forEach(s => {
        const [centerLineSegments, splaySegments] = SurveyHelper.getSegments(s.stations, s.shots);
        const [centerLines, splayLines, stationNamesGroup, stationSpheresGroup, group] = myscene.addToScene(s.stations, centerLineSegments, splaySegments, true);
        myscene.addSurvey(cave.name, s.name, { 'id': U.randomAlphaNumbericString(5), 'centerLines': centerLines, 'splays': splayLines, 'stationNames': stationNamesGroup, 'stationSpheres': stationSpheresGroup, 'group': group });
    });
    explorer.addCave(cave);
    myscene.fitScene();    
}

function importCsvFile(file) {
    Papa.parse(file, {
        header: false,
        comments: "#",
        dynamicTyping: true,
        complete: function (results) {
            const caveName = file.name;
            const cave = I.getCaveFromCsvFile(caveName, results.data);
            addCave(cave);
        },
        error: function (error) {
            console.error('Error parsing CSV:', error);
        }
    });
}

document.getElementById('topodroidInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        importCsvFile(file);
    }
});

document.getElementById('polygonInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        imporPolygonFromFile(file);
    }
});