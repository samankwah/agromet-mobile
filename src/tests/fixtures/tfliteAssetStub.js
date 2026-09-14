/**
 * Stands in for the bundled `.tflite` binary under jest.
 *
 * metro turns `require('...cassava.tflite')` into an asset id; jest has no such
 * concept and would try to parse several megabytes of flatbuffer as JavaScript.
 * The value is never inspected, because `loadTensorflowModel` is mocked.
 */
module.exports = 1;
