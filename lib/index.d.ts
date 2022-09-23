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
    tags?: string[];
}
export declare const transporters: {
    console: () => winston.transports.ConsoleTransportInstance;
    file: (path: string) => DailyRotateFile;
};
interface LoggerOptions {
    path: string;
    logger?: winston.Logger;
    session?: LogPayload["session"];
    tags?: LogPayload["tags"];
}
export declare class Logger {
    private _logger;
    private _session?;
    private _tags?;
    private _path;
    private _consoleTransporter;
    private _fileTransporter;
    constructor(options: LoggerOptions);
    private extend;
    /**
     * Create a new instance of Logger extending the session data
     */
    withSession(data: LogPayload["data"]): Logger;
    /**
     * Create a new instance of Logger extending the tags data
     */
    withTags(...data: string[]): Logger;
    /**
     * Extends this istance of Logger with new session data
     */
    addSession(data: LogPayload["data"]): () => void;
    /**
     * Extends this istance of Logger with new tags data
     */
    addTag(...data: string[]): () => void;
    /**
     * Remove the session data in this instance
     */
    private removeSession;
    /**
     * Remove the tags data in this instance
     */
    private removeTag;
    /**
     * Clear all session in this instance
     */
    clearSession(): void;
    /**
     * Clear all tags in this instance
     */
    clearTags(): void;
    private log;
    info(message: string, data?: Record<string, any>): this;
    warn(message: string, data?: Record<string, any>): this;
    error(message: string, data?: Record<string, any>): this;
    success(message: string, data?: Record<string, any>): this;
    debug(message: string, data?: Record<string, any>): this;
    divider(): this;
    timer(name: string): {
        finish: () => void;
    };
    disableFile(): this;
    enableFile(): this;
}
export {};
