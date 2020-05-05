export enum Phase {
    RED_BAN_1   = 1,
    BLUE_BAN_1  = 2,
    RED_BAN_2   = 3,
    BLUE_BAN_2  = 4,
    RED_BAN_3   = 5,
    BLUE_BAN_3  = 6,
    RED_PICK_1  = 7,
    BLUE_PICK_1 = 8,
    BLUE_PICK_2 = 9,
    RED_PICK_2 = 10,
    RED_PICK_3 = 11,
    BLUE_PICK_3 = 12,
    RED_BAN_4   = 13,
    BLUE_BAN_4  = 14,
    RED_BAN_5   = 15,
    BLUE_BAN_5  = 16,
    BLUE_PICK_4 = 17,
    RED_PICK_4  = 18,
    RED_PICK_5  = 19,
    BLUE_PICK_5 = 20,
    FINISHED    = 21
}

enum Team {
    RED, BLUE
}

export interface State {
    phase: Phase

    redPicks: number[]
    redBans: number[]

    bluePicks: number[]
    blueBans: number[]

    paused: boolean
}

class StateChangeError extends Error {
    private readonly state: State;

    constructor(state: State, message: string) {
        super(message);
        this.state = state;
    }

    public getState() {
        return this.state;
    }
}

interface ShipConfig {
    id: number
    points: number
}

interface ScrimitarConfig {
    ships?: ShipConfig[]
    maxPoints?: number
}

/**
 * A state machine that handles the pick and ban phase of 5v5 scrims.
 * Provide it the current state and it will tell you what can happen next - or let it maintain the state for you.
 */
class ScrimitarMachine {

    private state: State = {
        phase: Phase.RED_BAN_1,

        redPicks: [],
        redBans: [],

        bluePicks: [],
        blueBans: [],

        paused: true
    };

    private readonly config: ScrimitarConfig = {
        ships: [
            {id: 567, points: 3},
            {id: 256, points: 2},
            {id: 128, points: 1}
        ],
        maxPoints: 100
    };

    constructor(config?: ScrimitarConfig, initialState?: State) {
        this.config = {...this.config, ...config};
        this.state = initialState || this.state;
    }

    private getShipIds(): number[] {
        return this.config.ships!.map(s => s.id)
    }

    private isValidShipId(shipId: number): boolean {
        return this.getShipIds().includes(shipId);
    }

    private getShipPoints(shipId: number): number {
        this.assert(this.isValidShipId(shipId), "Invalid ship ID provided to getShipPoints");
        return this.config.ships!.find(s => s.id)!.points;
    }

    /**
     * Replace the entire current state. This should only be used for copying state from a remote machine since this doesn't check for validity
     * @param newState
     */
    public replaceState(newState: State): void {
        this.state = newState;
    }

    private mergeState(partial: any): void {
        this.state = {...this.state, ...partial};
    }

    public doPick(team: Team, shipId: number): void {
        this.assert(this.isPickPhase(), "Attempted to pick during non-pick phase");
        this.assert(this.isValidPick(team, shipId), "Ship is not a valid pick");

        if(team === Team.RED) {
            this.mergeState({redPicks: [...this.state.redPicks, shipId]});
        }
        if(team === Team.BLUE) {
            this.mergeState({bluePicks: [...this.state.bluePicks, shipId]});
        }

        this.doAdvancePhase();
    }

    public doBan(team: Team, shipId: number): void {
        this.assert(this.isBanPhase(), "Attempted to ban during non-ban phase");
        this.assert(this.isValidBan(team, shipId), "Ship is not a valid ban");

        if(team === Team.RED) {
            this.mergeState({redBans: [...this.state.redBans, shipId]});
        }
        if(team === Team.BLUE) {
            this.mergeState({blueBans: [...this.state.blueBans, shipId]});
        }

        this.doAdvancePhase();
    }

    /**
     * Helper method, not to be used directly.
     */
    private doAdvancePhase(): void {
        this.assert(this.state.phase < Phase.FINISHED, "Cannot advance phase when already finished");
        this.mergeState({phase: this.state.phase + 1});
    }

    /**
     * Returns a copy of the current state
     */
    public getState(): State {
        return Object.assign({}, this.state);
    }

    public getPointsRemaining(team: Team): number {
        return this.getPicks(team).map(sid => this.config.ships!.find(s => s.id === sid)).reduce((sum,part) => part ? sum + part.points : sum, 0)
    }

    public isValidPick(team: Team, shipId: number): boolean {
        this.assert(this.isValidShipId(shipId), "Invalid ship ID provided to isValidPick");

        const otherTeam = team === Team.RED ? Team.BLUE : Team.RED;

        // Checks whether or not picking a ship will cause either team to be unable to proceed

        if(!this.isShipAvailable(shipId)) { return false; } // ship has been picked or banned

        const shipPoints = this.getShipPoints(shipId);

        // Does this team have enough for this ship in the first place
        if(shipPoints > this.getPointsRemaining(team)) { return false; }

        // Will this leave enough pickable ships after for both teams?
        // Calculate everything *after* this pick has been supposedly made
        const currentTeamPointsRemaining = this.getPointsRemaining(team) - shipPoints;
        const otherTeamPointsRemaining = this.getPointsRemaining(team === Team.RED ? Team.BLUE : Team.RED)

        const currentTeamPicksRemaining = this.getPickPhasesRemaining(team) - 1;
        const otherTeamPicksRemaining = this.getPickPhasesRemaining(otherTeam);
        const picksRemaining = currentTeamPicksRemaining + otherTeamPicksRemaining

        const availableShipIds = this.getAvailableShipIds().filter(id => id !== shipId);
        const cheapestPicksRemaining = this.config.ships!.filter(s => availableShipIds.includes(s.id)).sort((a,b) => a.points - b.points).slice(0, picksRemaining);

        // assuming each team gets the cheapest ships in order, check to ensure everyone can buy the remaining cheapest ships
        let otherTeamTotalMinimum = 0;
        let currentTeamTotalMinimum = 0;

        for(let i = 0; i <= cheapestPicksRemaining.length; i++) {
            if(i % 2) {// odd number, current team pick
                currentTeamTotalMinimum += cheapestPicksRemaining[i].points
            } else { // even number, other team pick
                otherTeamTotalMinimum += cheapestPicksRemaining[i].points
            }

            if(currentTeamPointsRemaining < currentTeamTotalMinimum || otherTeamPointsRemaining < otherTeamTotalMinimum) {
                // one or the other team does not have enough points
                return false;
            }
        }

        return true;
    }

    public isValidBan(team: Team, shipId: number): boolean {

        this.assert(this.isValidShipId(shipId), "Invalid ship ID provided to isValidPick");

        if(!this.isShipAvailable(shipId)) { return false; } // ship has been picked or banned already

        // TODO: Ensure that banning something will not make a team be unable to proceed.

        return true;
    }

    public getValidPicks(team: Team): number[] {
        return this.getAvailableShipIds().filter(sid => this.isValidPick(team, sid))
    }

    public getPicks(team?: Team): number[] {
        switch(team) {
            case Team.RED: return this.state.redPicks;
            case Team.BLUE: return this.state.bluePicks;
            default: return [...this.state.redPicks, ...this.state.bluePicks]
        }
    }

    public getBans(team?: Team): number[] {
        switch(team) {
            case Team.RED: return this.state.redBans;
            case Team.BLUE: return this.state.blueBans;
            default: return [...this.state.redBans, ...this.state.blueBans]
        }
    }

    public isShipPicked(shipId: number): boolean {
        return this.getPicks().includes(shipId);
    }

    public isShipBanned(shipId: number): boolean {
        return this.getBans().includes(shipId);
    }

    /**
     * Get ship IDs that are available for a pick OR ban
     */
    public getAvailableShipIds(): number[] {
        return this.getShipIds().filter(s => !this.getBans().includes(s))
    }

    /**
     * Is the ship available to be picked or banned. Does not consider points.
     * @param shipId the ship ID to be checked
     */
    public isShipAvailable(shipId: number) {
        return this.getAvailableShipIds().includes(shipId);
    }

    public canTeamPickNow(team: Team): boolean {
        return this.isTeamPhase(team) && this.isPickPhase()
    }

    public canTeamBanNow(team: Team): boolean {
        return this.isTeamPhase(team) && this.isBanPhase()
    }
    
    public isPaused(): boolean {
        return this.state.paused;
    }

    public isFinished(): boolean {
        return this.state.phase === Phase.FINISHED;
    }

    private assert(cond: boolean, message: string): void {
        if(!cond) {
            throw new StateChangeError(this.state, message);
        }
    }
    
    // Phase logic. Whole lotta copypasta.

    public isTeamPhase(team: Team): boolean {
        switch(this.state.phase) {
            case Phase.RED_BAN_1:
            case Phase.RED_BAN_2:
            case Phase.RED_BAN_3:
            case Phase.RED_BAN_4:
            case Phase.RED_BAN_5:
            case Phase.RED_PICK_1:
            case Phase.RED_PICK_2:
            case Phase.RED_PICK_3:
            case Phase.RED_PICK_4:
            case Phase.RED_PICK_5:
                return team === Team.RED;
            case Phase.BLUE_BAN_1:
            case Phase.BLUE_BAN_2:
            case Phase.BLUE_BAN_3:
            case Phase.BLUE_BAN_4:
            case Phase.BLUE_BAN_5:
            case Phase.BLUE_PICK_1:
            case Phase.BLUE_PICK_2:
            case Phase.BLUE_PICK_3:
            case Phase.BLUE_PICK_4:
            case Phase.BLUE_PICK_5:
                return team === Team.BLUE;
            default:
                return false;
        }
    }

    public isBanPhase(): boolean {
        switch(this.state.phase) {
            case Phase.RED_BAN_1:
            case Phase.RED_BAN_2:
            case Phase.RED_BAN_3:
            case Phase.RED_BAN_4:
            case Phase.RED_BAN_5:
            case Phase.BLUE_BAN_1:
            case Phase.BLUE_BAN_2:
            case Phase.BLUE_BAN_3:
            case Phase.BLUE_BAN_4:
            case Phase.BLUE_BAN_5:
                return true;
            default:
                return false;
        }
    }

    public isPickPhase(): boolean {
        switch(this.state.phase) {
            case Phase.RED_PICK_1:
            case Phase.RED_PICK_2:
            case Phase.RED_PICK_3:
            case Phase.RED_PICK_4:
            case Phase.RED_PICK_5:
            case Phase.BLUE_PICK_1:
            case Phase.BLUE_PICK_2:
            case Phase.BLUE_PICK_3:
            case Phase.BLUE_PICK_4:
            case Phase.BLUE_PICK_5:
                return true;
            default:
                return false;
        }
    }

    public getPickPhasesRemaining(team?: Team): number {

        // If current phase is a pick phase, it is counted as a remaining pick.

        const p = function(redVal: number, blueVal: number) {
            return team !== undefined ? (team === Team.RED ? redVal : blueVal) : redVal+blueVal;
        }

        switch(this.state.phase) {
            // team ? team === Team.RED ? RED : BLUE : BOTH
            case Phase.RED_BAN_1:
            case Phase.BLUE_BAN_1:
            case Phase.RED_BAN_2:
            case Phase.BLUE_BAN_2:
            case Phase.RED_BAN_3:
            case Phase.BLUE_BAN_3:
            case Phase.RED_PICK_1: return p(5, 5);
            case Phase.BLUE_PICK_1: return p(4, 5);
            case Phase.BLUE_PICK_2: return p(4, 4);
            case Phase.RED_PICK_2: return p(4, 3);
            case Phase.RED_PICK_3: return p(3, 3);
            case Phase.BLUE_PICK_3: return p(2, 3);
            case Phase.RED_BAN_4:
            case Phase.BLUE_BAN_4:
            case Phase.RED_BAN_5:
            case Phase.BLUE_BAN_5:
            case Phase.BLUE_PICK_4: return p(2, 2);
            case Phase.RED_PICK_4: return p(2, 1);
            case Phase.RED_PICK_5: return p(1, 1);
            case Phase.BLUE_PICK_5: return p(0, 1);
            case Phase.FINISHED: return 0;
            default:
                throw new StateChangeError(this.getState(), "Unknown phase for pickPhasesRemaining");
        }
    }

}

export default ScrimitarMachine;