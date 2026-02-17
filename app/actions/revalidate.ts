'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateProducts() {
    revalidatePath('/')
    revalidatePath('/category/[id]', 'page')
    revalidatePath('/sub_category/[id]', 'page')
}
