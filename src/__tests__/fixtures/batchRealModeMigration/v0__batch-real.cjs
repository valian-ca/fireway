module.exports = {
  migrate: async ({ firestore }) => {
    // Test batch operations in real (non-dry-run) mode to cover lines 75, 89, 109, 126
    const batch = firestore.batch()

    // Test batch.create (line 75)
    batch.create(firestore.collection('test').doc('batch-create'), { created: true })

    // Test batch.set (line 89)
    batch.set(firestore.collection('test').doc('batch-set'), { set: true })

    // Create docs first for update and delete
    await firestore.collection('test').doc('batch-update').set({ initial: true })
    await firestore.collection('test').doc('batch-delete').set({ toDelete: true })

    // Test batch.update (line 98)
    batch.update(firestore.collection('test').doc('batch-update'), { updated: true })

    // Test batch.delete (line 109)
    batch.delete(firestore.collection('test').doc('batch-delete'))

    // Test batch.commit in real mode (line 121)
    await batch.commit()
  },
}
