class ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;


    constructor(statusCode: number, data: T, message: string = "Success",status:boolean){
        this.statusCode=statusCode
        this.data=data
        this.message=message
        this.success=status || statusCode<400
    }
}


export default ApiResponse