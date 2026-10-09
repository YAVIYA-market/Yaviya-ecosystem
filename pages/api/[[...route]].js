import handler from "../../backend/http-handler.js";
export const config = {
  api: { bodyParser: false, responseLimit: false },
  maxDuration: 60,
};
export default handler;
