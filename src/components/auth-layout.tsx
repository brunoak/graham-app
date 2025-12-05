
import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#004D36]">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/auth-bg.png"
                    alt="Background"
                    fill
                    className="object-cover opacity-100"
                    quality={100}
                    priority
                />
                {/* Gradient Overlay for better text contrast if needed, matches the design's dark emerald feel */}
                <div className="absolute inset-0 bg-emerald-950/30 mix-blend-multiply" />
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-[440px] px-4">
                <div className="bg-white rounded-[16px] shadow-2xl p-8 md:p-10 mb-8 w-full">
                    {children}
                </div>
            </div>
        </div>
    )
}
