module.exports = {
  migrate: async ({ firestore }) => {
    // Test calling Firestore methods that return non-proxied types (line 52)
    // For example, calling methods that return primitives or other objects

    // Get a collection and call methods
    const col = firestore.collection('test')

    // Call listDocuments() which returns a Promise<DocumentReference[]>
    // This should test the generic return path
    await col.listDocuments()

    // Get a document reference
    const docRef = col.doc('test-doc')

    // Call isEqual() which returns a boolean (non-proxied type)
    const anotherDocRef = col.doc('test-doc')
    docRef.isEqual(anotherDocRef)

    // Call get() which returns a Promise<DocumentSnapshot> (non-proxied type) - line 271
    await docRef.set({ data: 'test' })
    await docRef.get()

    // Test batch methods that return non-WriteBatch, non-CollectionReference, non-DocumentReference
    const batch = firestore.batch()
    // The batch methods mostly return the batch itself or commit returns a promise
    // Let's just test commit which returns Promise<WriteResult[]> - line 121
    await batch.commit()

    // Test collection methods that return non-Collection/Document types - line 178
    const query = col.where('field', '==', 'value')
    // query.get() returns Promise<QuerySnapshot> (non-proxied type)
    await query.get()
  },
}
