import React from "react";

function randomIntFromInterval(min: number, max: number) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

interface PlayerProps {
    name: string,
    characterId: number,
    chosenShip?: number,
}

// Connect these to state, simply up
const teamRed: PlayerProps[] = [
    {name: "Jaydubs", characterId: 96520742, chosenShip: 586},
    {name: "Jeronyx", characterId: 2112879530},
    {name: "Gatt", characterId: 2112695795},
    {name: "Jackaryas", characterId: 647349244},
    {name: "Amelia", characterId: 2107394511, chosenShip: 590}
]

const teamBlue: PlayerProps[] = [
    {name: "vordak", characterId: 2114193537},
    {name: "Lucas Quaan", characterId: 185935021, chosenShip: 582},
    {name: "Wild Things", characterId: 93316312},
    {name: "progodlegend", characterId: 317012339, chosenShip: 584},
    {name: "Gobbins", characterId: 342545170}
]

const Player = (props: PlayerProps) => {
    return (
        <div className={"shadow-container"}>
            <div className={"player" + (props.chosenShip ? " ship-picked" : "")}>
                <div className={"ship"}>
                    {props.chosenShip ? <img src={"https://images.evetech.net/types/" + props.chosenShip + "/render?size=512"} /> : ""}
                </div>
                <div className={"info"}>
                    <h2>{props.name}</h2>
                    {props.chosenShip ?
                        <div>is piloting a Reaper</div> :
                        <div>has not yet been assigned a ship.</div>}
                </div>
                <div className={"portrait"}>
                    <img src={"https://images.evetech.net/characters/" + props.characterId + "/portrait"} />
                </div>
            </div>
        </div>
    )
}

const StreamView = () => {
    return (
        <div className={"stream-container"}>

            <div className={"team-container left eve-window"}>
                <h1 style={{color: '#9f0f00'}}>Team Red</h1>
                {teamRed.map(p => Player(p))}

                <div className={"eve-border-corner-top-left"} />
                <div className={"eve-border-corner-top-right"} />
                <div className={"eve-border-corner-bottom-right"} />
                <div className={"eve-border-corner-bottom-left"} />
            </div>

            <div className={"draft-container eve-window"}>
                <h1>Draft</h1>

                <div className={"eve-border-corner-top-left"} />
                <div className={"eve-border-corner-top-right"} />
                <div className={"eve-border-corner-bottom-right"} />
                <div className={"eve-border-corner-bottom-left"} />
            </div>

            <div className={"team-container right eve-window"}>
                <h1 style={{color: '#26419f'}}>Team Blue</h1>
                {teamBlue.map(p => Player(p))}

                <div className={"eve-border-corner-top-left"} />
                <div className={"eve-border-corner-top-right"} />
                <div className={"eve-border-corner-bottom-right"} />
                <div className={"eve-border-corner-bottom-left"} />
            </div>

        </div>
    )
}

export default StreamView;