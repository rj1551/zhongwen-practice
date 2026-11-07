const { sigv4 } = require("./sigv4.js");
(async () => {
  // AWS docs, "Signature Calculations for the Authorization Header", example: GET Object
  const h = await sigv4({ method: "GET", url: "https://examplebucket.s3.amazonaws.com/test.txt", headers: { Range: "bytes=0-9" },
    payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", akid: "AKIAIOSFODNN7EXAMPLE",
    secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", region: "us-east-1", date: new Date("2013-05-24T00:00:00Z") });
  const want = "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41";
  console.log(h.authorization.endsWith("Signature=" + want) ? "PASS GET Object example" : "FAIL " + h.authorization);
  // example: GET Bucket (list objects) with query parameters
  const h2 = await sigv4({ method: "GET", url: "https://examplebucket.s3.amazonaws.com/?max-keys=2&prefix=J", payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    akid: "AKIAIOSFODNN7EXAMPLE", secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", region: "us-east-1", date: new Date("2013-05-24T00:00:00Z") });
  const want2 = "34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7";
  console.log(h2.authorization.endsWith("Signature=" + want2) ? "PASS GET Bucket (query) example" : "FAIL " + h2.authorization);
  // PUT Object example
  const body = "Welcome to Amazon S3.";
  const ph = require("crypto").createHash("sha256").update(body).digest("hex");
  const h3 = await sigv4({ method: "PUT", url: "https://examplebucket.s3.amazonaws.com/test$file.text", headers: { Date: "Fri, 24 May 2013 00:00:00 GMT", "x-amz-storage-class": "REDUCED_REDUNDANCY" }, payloadHash: ph,
    akid: "AKIAIOSFODNN7EXAMPLE", secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", region: "us-east-1", date: new Date("2013-05-24T00:00:00Z") });
  const want3 = "98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd";
  console.log(h3.authorization.endsWith("Signature=" + want3) ? "PASS PUT Object example" : "FAIL " + h3.authorization);
})();
