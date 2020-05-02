const X_NODES_NUM = 40;
const Y_NODES_NUM = 20;
const WALL_CLASS = 'wall';
const END_CLASS = 'end';
const BOX_CLASS = 'box';
const ROW_CLASS = 'row';
const BUTTON_CLASS = 'btn';
const VISITED_CLASS = 'visited-box';

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

class Application{
    state = {
        startEnd: [],
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

        this.toggleStartEnd({i, j});
    }

    getHeuristicDistanceForNode = ({ i, j}) => {
        const end = this.state.startEnd[1];

        if (!end) {
            return null;
        }

        return Math.abs(end.i - i) ** 2 + Math.abs(end.j - j) ** 2
    }

    handleStart = event => {
        // f = g + h (total cost of the node)
        // g - distance between the current node and the start node
        // h - heuristic - estimated distance from the current node to the end node

        const start = this.state.startEnd[0];
        const end = this.state.startEnd[1];

        const OPEN = [];  // candidates for examining
        const CLOSED = [];  // examined nodes

        OPEN.push({ ...start, g: 0, h: this.getHeuristicDistanceForNode({ ...start }) });

        while (OPEN[0].i !== end.i && OPEN[0].j !== end.j) {
            const current = OPEN.splice(0, 1);

            CLOSED.push(current);

            for (let neighbour of this.getNodeNeighbours({ i: current.i, j: current.j})) {
                const {i, j} = neighbour;
                const g = current.g + 1;

                const neighbourAlreadyInOPEN = OPEN.find(node => node.i === i && node.j === j);

                if (neighbourAlreadyInOPEN && neighbourAlreadyInOPEN.g > g) {

                }

                OPEN.push({ i, j, g, h: this.getHeuristicDistanceForNode({ i, j })});
            }

            // sort by lowest f first
            OPEN.sort((a, b) => a.g + a.h < b.g + b.h ? -1 : 1);
        }


    }


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
        this.state.gridMap.forEach(this.reRenderRow);

    }

    renderControls = () => {
        const container = document.createElement('div');

        container.appendChild(this.renderStartButton());

        return container;
    }

    renderStartButton = () => {
        const button = document.createElement('div');
        button.setAttribute('class', BUTTON_CLASS);
        button.innerHTML = 'START';

        button.addEventListener('click', this.handleStart);

        return button;
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
            [VISITED_CLASS]: nodeState === 3
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
        node.addEventListener('contextmenu', this.createReactiveHandler(this.handleRightClick));
        node.addEventListener('dragstart', event => event.preventDefault()); // so there won't be need to handle drag events
        return node;
    }
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




(function() {
    const app = new Application();

    window.app = app;

    app.initializeState(Y_NODES_NUM, X_NODES_NUM);
    app.render();
})();











