// import { observable } from 'https://cdn.skypack.dev/mobx';
//
// window.observable = observable;

const X_NODES_NUM = 40;
const Y_NODES_NUM = 20;
const WALL_CLASS = 'wall';
const END_CLASS = 'end';
const BOX_CLASS = 'box';
const ROW_CLASS = 'row';
const BUTTON_CLASS = 'btn';
const VISITED_CLASS = 'visited-box';
const PATH_CLASS = 'path-box';
const CURRENT_NODE_DISPLAY = 'current-node-display';
const CURRENT_NODE_DISPLAY_ID = 'current-node-display-id';
const CONTROLS_CONTAINER = 'controls-container';
const INFO_CONTAINER = 'info-container';
const INFO_CONTAINER_ID = 'info-container-id';
const QUEUED_CLASS = 'queued-box';
const possibleAxisSteps = [-1, 1, 0]

function classNames(classes) {
    const classList = [];

    for (let cls in classes) {
        if (classes[cls]) {
            classList.push(cls);
        }
    }

    return classList.join(' ');
}

function createPathNode({ i, j, g, h, parent = null }) {
    return {
        i, j, g, h, parent
    }
}

class Application{
    state = {
        startEnd: [],
        path: new Map(),
        gridMap: [] // 0 - empty, 1 - wall
    };

    initializeState = (rows, cols) => {
        this.state.dimensions = { rows, cols };
        this.state.startEnd = [];

        for (let y=0; y < rows; y++) {
            this.state.gridMap.push(Array(cols).fill(0))
        }
    }

    getDimenstions = () => {
        return {
            rowsLength: this.state.gridMap.length,
            columnsLength: this.state.gridMap[0].length
        }
    }

    createReactiveHandler = f => {
        const reactiveHandler = (...args) => {
            f(...args);
            this.reRender();
        }

        return reactiveHandler;
    };


    handleMouseEnter = event => {
        if (event.buttons !== 1) {
            return;
        }

        const box = event.target;

        const { i, j } = box.dataset;

        this.toggleWallBox(i, j);

        this.reRender();
    }

    toggleWallBox = (i, j) => {
        this.state.gridMap[j][i] = this.state.gridMap[j][i] === 0 ? 1 : 0
    }

    handleMouseDown = event => {
        if (event.button === 2) {
            return;
        }

        const box = event.target;

        const { i, j } = box.dataset;

        this.toggleWallBox(i, j);
        this.reRender();
    }

    resetBoxState = ({i, j}) => {
        this.state.gridMap[j][i] = 0;
    }

    toggleStartEnd = ({i, j}) => {
        if (this.state.startEnd.length === 2) {
            this.state.startEnd.forEach(this.resetBoxState);
            this.state.startEnd = [];
        }

        this.state.startEnd.push({i, j});
        this.state.gridMap[j][i] = 2;
    }

    handleRightClick = event => {
        event.preventDefault();

        const box = event.target;
        const { i, j } = box.dataset;

        this.toggleStartEnd({ i: parseInt(i, 10), j: parseInt(j, 10)});
    }

    getHeuristicDistanceForNode = ({ i, j}) => {
        const end = this.state.startEnd[1];

        if (!end) {
            return null;
        }

        return Math.abs(end.i - i) ** 2 + Math.abs(end.j - j) ** 2
    }

    tracePath = node => {
        let current = node;
        const path = [current];

        while (current.parent) {
            path.push(current.parent);
            current = current.parent;
        }

        return path;
    }

    generateNodeHash = node => `${node.i}, ${node.j}`;

    generatePathMap = pathArr => {
        const pathMap = new Map();

        pathArr.forEach(node => {
            pathMap.set(this.generateNodeHash(node), node);
        })

        return pathMap;
    }



    handleStart = async event => {
        // f = g + h (total cost of the node)
        // g - distance between the current node and the start node
        // h - heuristic - estimated distance from the current node to the end node

        const start = this.state.startEnd[0];
        const end = this.state.startEnd[1];

        const OPEN = [];  // candidates for examining
        const CLOSED = [];  // examined nodes'

        OPEN.push(createPathNode({
            i: start.i,
            j: start.j,
            g: 0,
            h: this.getHeuristicDistanceForNode({ ...start })
        }));

        // OPEN.push({ ...start, g: 0, h: this.getHeuristicDistanceForNode({ ...start }) });

        let current;

        do {
            current = OPEN.splice(0, 1)[0];

            this.state.gridMap[current.j][current.i] = 3;
            this.reRenderNode(3, current.i, current.j);

            await sleepTillNextFrame(); // await rerender;

            CLOSED.push(current);

            for (let neighbour of this.getNodeNeighbours({ i: current.i, j: current.j})) {
                console.log(`... inspect neighbor: ${neighbour.i} ${neighbour.j}`)
                const {i, j} = neighbour;
                const g = current.g + 1;  // cost

                const neighbourAlreadyInOPENIndex = OPEN.findIndex(node => node.i === i && node.j === j);
                const neighbourAlreadyInOPEN = OPEN[neighbourAlreadyInOPENIndex];
                if (neighbourAlreadyInOPEN && g < neighbourAlreadyInOPEN.g) {
                    // remove neighbor from OPEN, because new path is better
                    OPEN.splice(neighbourAlreadyInOPENIndex, 1);
                }

                const neighborAlreadyInCLOSEDIndex = CLOSED.findIndex(node => node.i === i && node.j === j);
                const neighborAlreadyInCLOSED = CLOSED[neighborAlreadyInCLOSEDIndex];

                if (neighborAlreadyInCLOSED && g < neighborAlreadyInCLOSED.g) {
                    // remove neighbor from CLOSED, because we need to re-open?
                    CLOSED.splice(neighborAlreadyInCLOSEDIndex, 1);
                }

                if (OPEN.findIndex(node => node.i === i && node.j === j) === -1
                    && CLOSED.findIndex(node => node.i === i && node.j === j) === -1) {
                    OPEN.push(createPathNode({
                        i, j, g,
                        h: this.getHeuristicDistanceForNode({ i, j }),
                        parent: current
                    }));

                    this.state.gridMap[j][i] = 4;
                    this.reRenderNode(4, i, j);

                    await sleepTillNextFrame();
                }
            }

            // sort by lowest f first
            OPEN.sort((a, b) => a.g + a.h < b.g + b.h ? -1 : 1);
        } while (OPEN.length
                && OPEN[0].i !== end.i
                || OPEN[0].j !== end.j
            )


        console.log('OPEN:', OPEN);
        console.log('CURRENT:', current);

        if (OPEN.length && OPEN[0].i === end.i && OPEN[0].j === end.j) {
            const path = this.tracePath(current);
            path.reverse();

            this.state.path = this.generatePathMap(path);
            console.log('path:', path);

            this.reRender();

        } else {
            console.log('NO PATH!');
        }


    }

    handlePath


    getNodeNeighbours = ({ i, j }) => {
        const possibleMoves = [
            {i: 0, j: -1},
            {i: 0, j: +1},
            {i: -1, j: 0},
            {i: +1, j: 0}
        ];

        const neighbours = possibleMoves.map(possibleMove => {
            const newI = i + possibleMove.i;
            const newJ = j + possibleMove.j;

            const { rowsLength, columnsLength } = this.getDimenstions();

            if (newI < 0 || newI >= columnsLength || newJ <0 || newJ >= rowsLength) return null;

            return {i: newI, j: newJ, state: this.state.gridMap[newJ][newI]};
        });

        // filter coordinates outside of the grid and walls
        return neighbours.filter(n => n !== null && n.state !== 1);
    }

    // ------ rendering ------

    render() {
        const container = document.getElementById('container')

        container.appendChild(this.renderControls());
        container.appendChild(this.renderContainer(this.state.gridMap));
    }

    reRender = () => {
        // window.requestAnimationFrame(() => {
        //     this.state.gridMap.forEach(this.reRenderRow);
        // })
        this.reRenderInfo(...this.state.startEnd);
        this.state.gridMap.forEach(this.reRenderRow);

    }

    renderControls = () => {
        const container = document.createElement('div');
        container.setAttribute('class', CONTROLS_CONTAINER);

        container.appendChild(this.renderStartButton());
        container.appendChild(this.renderCurrentNodeDisplay());
        container.appendChild(this.renderInfo());

        return container;
    }

    renderStartButton = () => {
        const button = document.createElement('div');
        button.setAttribute('class', BUTTON_CLASS);
        button.innerHTML = 'START';

        button.addEventListener('click', this.handleStart);

        return button;
    }

    renderCurrentNodeDisplay = () => {
        const div = document.createElement('div');
        div.setAttribute('class', CURRENT_NODE_DISPLAY);
        div.setAttribute('id', CURRENT_NODE_DISPLAY_ID);
        div.innerHTML = '';

        return div;

    }

    renderInfo = () => {
        const div = document.createElement('div');
        div.setAttribute('class', INFO_CONTAINER);
        div.setAttribute('id', INFO_CONTAINER_ID);

        return div;
    }

    reRenderInfo = (start, end) => {
        const div = document.getElementById(INFO_CONTAINER_ID);

        if (start){
            const startInfo = `Start = { i: ${start.i}, j: ${start.j} }; `;

            div.innerHTML = startInfo;
        }

        if (end) {
            const endInfo = `End = { i: ${end.i}, j: ${end.j} }`;

            div.innerHTML += endInfo;
        }
    }


    reRenderRow = (row, j) => {
        row.forEach((nodeState, i) => this.reRenderNode(nodeState, i, j));
    }

    reRenderNode = (nodeState, i, j) => {
        const box = document.querySelector(`[data-i="${i}"][data-j="${j}"`);
        const classes = classNames({
            [BOX_CLASS]: true,
            [WALL_CLASS]: nodeState === 1,
            [END_CLASS]: nodeState === 2,
            [VISITED_CLASS]: nodeState === 3,
            [QUEUED_CLASS]: nodeState === 4,
            [PATH_CLASS]: this.state.path.has(this.generateNodeHash({ i, j }))
        });

        box.setAttribute('class', classes);
    }

    renderContainer(gridMap) {
        const container = document.createElement('div');
        container.setAttribute('class', 'container');
        this.renderGrid(gridMap).forEach(row => container.appendChild(row));

        return container;
    }

    renderGrid(gridMap) {
        return gridMap.map((rowMap, rowIndex) => this.renderRow(rowMap, rowIndex));
    }

    renderRow(rowMap, rowIndex) {
        const row = document.createElement('div');
        row.setAttribute('class', ROW_CLASS);
        rowMap.forEach((nodeProps, columnIndex) => row.appendChild(this.renderNode(nodeProps, rowIndex, columnIndex)));

        return row;
    }

    handleDisplayCurrent = event => {
        const el = event.target;
        const { i, j } = el.dataset;

        document.getElementById(CURRENT_NODE_DISPLAY_ID).innerHTML = `i: ${i} j: ${j}`;
    }

    renderNode(nodeProps, rowIndex, columnIndex) {
        const node = document.createElement('div');

        const classes = classNames({
            [BOX_CLASS]: true,
            [WALL_CLASS]: nodeProps === 1
        })

        node.setAttribute('class', classes);
        node.dataset['i'] = columnIndex;
        node.dataset['j'] = rowIndex;

        node.addEventListener('mousedown', this.handleMouseDown);
        node.addEventListener('mouseenter',this.handleMouseEnter);
        node.addEventListener('mouseenter', this.handleDisplayCurrent);
        node.addEventListener('contextmenu', this.createReactiveHandler(this.handleRightClick));
        // so there won't be need to handle drag events
        node.addEventListener('dragstart', event => event.preventDefault());
        return node;
    }

    getNode = ({ i, j}) => this.state.gridMap[j][i];
}

function createClickHandler() {
    let clickedNodes = [];

    function handleClick (event) {
        const box = event.target;

        if (box.classList.contains(WALL_CLASS)) {
            box.classList.remove(WALL_CLASS);
        } else {
            if (clickedNodes.length < 2 && !box.classList.contains(END_CLASS)) {
                clickedNodes.push(box);
            } else {
                clickedNodes.forEach(box => box.classList.remove(END_CLASS));
                clickedNodes = [box];
            }

            box.classList.add(END_CLASS);
        }

        console.log('number of ends:', clickedNodes.length);
    }

    return handleClick;
}


function toggleWallBox(element) {
    if (element.classList.contains(WALL_CLASS)) {
        element.classList.remove(WALL_CLASS)
    } else if(!element.classList.contains(END_CLASS)) {
        element.classList.add(WALL_CLASS);
    }
}

function handleMouseDown(event) {
    const box = event.target;

    if (!box.classList.contains(WALL_CLASS) && !box.classList.contains(END_CLASS)) {
        box.classList.remove(WALL_CLASS);
    }
}

function handleDragOver(event) {
    const box = event.target;

    toggleWallBox(box);
    // console.log('DRAGGED OVER');
}

function getAllBoxes() {
    return document.getElementsByClassName(BOX_CLASS);
}

function attachBoxHandlers() {
    const clickHandler = createClickHandler();
    const boxes = getAllBoxes();

    for (let box of boxes) {
        box.addEventListener('mouseover', handleMouseEnter);
        box.addEventListener('click', clickHandler);
        // box.addEventListener('mousedown', handleMouseDown);
        box.addEventListener('dragenter', handleDragOver);
        box.addEventListener('dragstart', () => console.log('DRAG START'));
    }
}

function sleepTillNextFrame() {
    return new Promise(requestAnimationFrame);
}



(function() {
    const app = new Application();

    window.app = app;

    app.initializeState(Y_NODES_NUM, X_NODES_NUM);
    app.render();
})();











