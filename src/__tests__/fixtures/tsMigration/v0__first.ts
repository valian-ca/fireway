import { type IMigrationFunctionsArguments } from '../../../types'

export async function migrate({ firestore }: IMigrationFunctionsArguments) {
  await firestore.collection('data').doc('one').set({ key: 'value' })
}
