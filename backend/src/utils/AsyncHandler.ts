import { Request, Response, NextFunction } from 'express';

type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | any;

const AsyncHandler = (resquestHandler:RequestHandler) =>{
    return  (req:Request,res:Response,next:NextFunction):void => {
          Promise.resolve(resquestHandler(req,res,next))
          .catch((err)=>next(err))
      }
  }
  
  export default AsyncHandler