import { Request, Response } from "express";



export const posts = (req: Request, res: Response) => {
    try {
    
    } catch (err) {
      res.status(500).send("SERVER ERROR");
    }
}