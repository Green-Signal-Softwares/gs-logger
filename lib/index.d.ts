import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
export declare type JSONType = string | number | boolean | undefined | JSONObjectType | Array<JSONType>;
export declare type JSONObjectType = {
    [x: string]: JSONType;
};
export declare type CommonLog<T> = T & {
    level: string;
    timestamp: string;
};
export interface LogPayload {
    message: string;
    data?: JSONObjectType;
    session?: JSONObjectType;
}
export declare const transporters: {
    console: () => winston.transports.ConsoleTransportInstance;
    file: (path: string) => DailyRotateFile;
};
interface LoggerOptions {
    path: string;
    logger?: winston.Logger;
    session?: LogPayload["session"];
}
export declare class Logger {
    private _logger;
    private _session?;
    private _path;
    private _consoleTransporter;
    private _fileTransporter;
    constructor(options: LoggerOptions);
    private extend;
    private log;
    setData(data: LogPayload["data"]): Logger;
    use(data: LogPayload["data"]): () => void;
    private remove;
    divider(): this;
    info(message: string, data?: Record<string, any>): this;
    warn(message: string, data?: Record<string, any>): this;
    error(message: string, data?: Record<string, any>): this;
    success(message: string, data?: Record<string, any>): this;
    debug(message: string, data?: Record<string, any>): this;
    timer(name: string): {
        finish: () => void;
    };
    disableFile(): this;
    enableFile(): this;
}
export {};
