export namespace main {
	
	export class Pop {
	    id: string;
	    residenceId: string;
	    jobId: string;
	    size: number;
	    drivingDistance: number;
	    drivingSeconds: number;
	
	    static createFrom(source: any = {}) {
	        return new Pop(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.residenceId = source["residenceId"];
	        this.jobId = source["jobId"];
	        this.size = source["size"];
	        this.drivingDistance = source["drivingDistance"];
	        this.drivingSeconds = source["drivingSeconds"];
	    }
	}
	export class DemandPoint {
	    id: string;
	    location: number[];
	    jobs: number;
	    residents: number;
	    popIds: string[];
	
	    static createFrom(source: any = {}) {
	        return new DemandPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.location = source["location"];
	        this.jobs = source["jobs"];
	        this.residents = source["residents"];
	        this.popIds = source["popIds"];
	    }
	}
	export class DemandData {
	    points: DemandPoint[];
	    pops: Pop[];
	
	    static createFrom(source: any = {}) {
	        return new DemandData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.points = this.convertValues(source["points"], DemandPoint);
	        this.pops = this.convertValues(source["pops"], Pop);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Place {
	    code: string;
	    name: string;
	    locale?: string;
	    bbox: number[];
	    thumbnailBbox?: number[];
	
	    static createFrom(source: any = {}) {
	        return new Place(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.name = source["name"];
	        this.locale = source["locale"];
	        this.bbox = source["bbox"];
	        this.thumbnailBbox = source["thumbnailBbox"];
	    }
	}
	export class GeneratorConfig {
	    "tile-zoom-level": number;
	    places: Place[];
	
	    static createFrom(source: any = {}) {
	        return new GeneratorConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this["tile-zoom-level"] = source["tile-zoom-level"];
	        this.places = this.convertValues(source["places"], Place);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class NodeJSStatus {
	    available: boolean;
	    version: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new NodeJSStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.version = source["version"];
	        this.path = source["path"];
	    }
	}
	export class OutputFile {
	    name: string;
	    sizeMb: number;
	    modifiedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new OutputFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.sizeMb = source["sizeMb"];
	        this.modifiedAt = source["modifiedAt"];
	    }
	}
	
	export class PlaceOutput {
	    code: string;
	    files: OutputFile[];
	
	    static createFrom(source: any = {}) {
	        return new PlaceOutput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.files = this.convertValues(source["files"], OutputFile);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Response___main_PlaceOutput_ {
	    status: string;
	    data?: PlaceOutput[];
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Response___main_PlaceOutput_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.data = this.convertValues(source["data"], PlaceOutput);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Response_bool_ {
	    status: string;
	    data?: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Response_bool_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.data = source["data"];
	        this.error = source["error"];
	    }
	}
	export class Response_main_DemandData_ {
	    status: string;
	    data?: DemandData;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Response_main_DemandData_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.data = this.convertValues(source["data"], DemandData);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Response_main_GeneratorConfig_ {
	    status: string;
	    data?: GeneratorConfig;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Response_main_GeneratorConfig_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.data = this.convertValues(source["data"], GeneratorConfig);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Response_main_NodeJSStatus_ {
	    status: string;
	    data?: NodeJSStatus;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Response_main_NodeJSStatus_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.data = this.convertValues(source["data"], NodeJSStatus);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Response_string_ {
	    status: string;
	    data?: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Response_string_(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.data = source["data"];
	        this.error = source["error"];
	    }
	}

}

