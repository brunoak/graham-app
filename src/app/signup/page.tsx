"use client"

import { useTransition, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signupSchema } from "@/lib/schemas"
import { signup } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"
import { z } from "zod"
import AuthLayout from "@/components/auth-layout"
import Image from "next/image"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function SignupPage() {
    const [isPending, startTransition] = useTransition()
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const form = useForm<z.infer<typeof signupSchema>>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    })

    function onSubmit(values: z.infer<typeof signupSchema>) {
        startTransition(async () => {
            const formData = new FormData()
            formData.append("fullName", values.fullName)
            formData.append("email", values.email)
            formData.append("password", values.password)

            const result = await signup(formData)
            if (result?.error) {
                toast.error(result.error)
            }
        })
    }

    return (
        <AuthLayout>
            <div className="flex flex-col items-center mb-8">
                <Image
                    src="/images/logo-green.png"
                    alt="Graham Logo"
                    width={180}
                    height={60}
                    className="mb-8 dark:hidden block"
                    priority
                />
                <Image
                    src="/images/logo-white.png"
                    alt="Graham Logo"
                    width={180}
                    height={60}
                    className="mb-8 hidden dark:block"
                    priority
                />
                <h1 className="text-[#1A202C] text-xl font-bold mb-2">Registrar-se</h1>
                <p className="text-[#718096] text-xs text-center max-w-xs">
                    É novo em nossa plataforma? Registre-se agora! Leva apenas um minuto.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[#4A5568] text-sm font-medium">Nome</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Digite seu nome"
                                        {...field}
                                        className="h-10 border-gray-200 focus-visible:ring-emerald-600 rounded-md !bg-white !text-gray-900 placeholder:text-gray-400"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[#4A5568] text-sm font-medium">Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Digite seu e-mail"
                                        {...field}
                                        className="h-10 border-gray-200 focus-visible:ring-emerald-600 rounded-md !bg-white !text-gray-900 placeholder:text-gray-400"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[#4A5568] text-sm font-medium">Senha</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="******"
                                            {...field}
                                            className="h-10 border-gray-200 focus-visible:ring-emerald-600 rounded-md !bg-white !text-gray-900 placeholder:text-gray-400 pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-gray-500" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-gray-500" />
                                            )}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[#4A5568] text-sm font-medium">Confirmar Senha</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="******"
                                            {...field}
                                            className="h-10 border-gray-200 focus-visible:ring-emerald-600 rounded-md !bg-white !text-gray-900 placeholder:text-gray-400 pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4 text-gray-500" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-gray-500" />
                                            )}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex items-center space-x-2">
                        <input type="checkbox" id="terms" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-600" />
                        <label htmlFor="terms" className="text-xs text-[#718096]">Eu aceito os Termos e Condições</label>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 bg-[#3182CE] hover:bg-[#2B6CB0] text-white font-medium rounded-md text-sm transition-colors"
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Registrar"}
                    </Button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2 text-gray-500 uppercase">OU assine com</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 h-10">
                        <Button variant="outline" type="button" className="h-full bg-gray-50 border-none hover:bg-gray-100 font-bold text-lg text-gray-600">
                            G
                        </Button>
                        <Button variant="outline" type="button" className="h-full bg-gray-50 border-none hover:bg-gray-100 font-bold text-lg text-gray-600">
                            f
                        </Button>
                    </div>

                </form>
            </Form>

            <div className="absolute -bottom-16 left-0 w-full text-center">
                <span className="text-gray-300 text-sm">Eu já tenho uma conta </span>
                <Link href="/login" className="text-white font-bold hover:underline">
                    Entrar
                </Link>
            </div>
        </AuthLayout>
    )
}
