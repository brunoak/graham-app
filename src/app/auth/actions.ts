'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from '@/lib/schemas'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const rawData = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const validation = loginSchema.safeParse(rawData)

    if (!validation.success) {
        // Use .issues for standard ZodError access
        return { error: 'Dados inválidos: ' + validation.error.issues[0].message }
    }

    const { email, password } = validation.data

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error('Login error:', error)
        return { error: 'Credenciais inválidas ou erro no login.' }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const rawData = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        fullName: formData.get('fullName') as string,
        confirmPassword: formData.get('password') as string, // Fallback for schema check
    }

    const validation = signupSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: 'Dados inválidos: ' + validation.error.issues[0].message }
    }

    const { email, password, fullName } = validation.data

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard') // Or verify email page
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
