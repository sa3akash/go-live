import { NextFunction, Request, Response } from "express";
import { User } from "../model/User";
import { v4 as uuid } from "uuid";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, password, email } = req.body;
  try {
    if (!name || !password || !email) {
      //  res.status(400).send("All fields are required");
      return next("All fields are required");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return next("User already exists");
    }

    const user = await User.create({
      name,
      password,
      email,
      streamKey: uuid(),
    });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).send("SERVER ERROR");
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { password, email } = req.body;

  try {
    if (!password || !email) {
      return next("All fields are required");
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return next("User already exists");
    }
    if (existingUser.password !== password) {
      return next("Invalid password");
    }

    res.status(200).json(existingUser);
  } catch (err) {
    res.status(500).send("SERVER ERROR");
  }
};


export const regenatateKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { streamKey } = req.body;

  try {
    if (!streamKey) {
      return next("All fields are required");
    }

    const existingUser = await User.findOne({ streamKey });

    if (!existingUser) {
      return next("User already exists");
    }

    existingUser.streamKey = uuid();
    const newUser = await existingUser.save();

    res.status(200).json(newUser);
    
  } catch (err) {
    res.status(500).send("SERVER ERROR");
  }
};
