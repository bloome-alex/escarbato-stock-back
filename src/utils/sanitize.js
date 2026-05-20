export class Sanitizer {
  static record(doc) {
    const plain = doc.toObject ? doc.toObject() : doc;
    delete plain._id;
    return plain;
  }

  static list(records) {
    return records.map(record => {
      delete record._id;
      return record;
    });
  }
}
