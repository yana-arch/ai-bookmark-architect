import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../src/services/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onAuthError
}) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsLoading(false);
          onAuthSuccess();
          onClose();
        } else if (event === 'SIGNED_OUT') {
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [isOpen, onAuthSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#282C34] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Đăng nhập</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            <span className="ml-3 text-gray-300">Đang xử lý...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Đăng nhập để đồng bộ dữ liệu bookmark của bạn trên cloud.
            </p>

            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#10b981',
                      brandAccent: '#059669',
                    },
                    space: {
                      spaceSmall: '4px',
                      spaceMedium: '8px',
                      spaceLarge: '16px',
                      labelBottomMargin: '8px',
                      anchorBottomMargin: '4px',
                      emailInputSpacing: '4px',
                      socialAuthSpacing: '4px',
                      buttonPadding: '10px 15px',
                      inputPadding: '10px 15px',
                    },
                    fontSizes: {
                      baseBodySize: '13px',
                      baseInputSize: '14px',
                      baseLabelSize: '14px',
                      baseButtonSize: '14px',
                    },
                    radii: {
                      borderRadiusButton: '4px',
                      buttonBorderRadius: '4px',
                      inputBorderRadius: '4px',
                    },
                  },
                },
                className: {
                  container: 'auth-container',
                  button: 'auth-button',
                  input: 'auth-input',
                  label: 'auth-label',
                  message: 'auth-message',
                },
              }}
              providers={['google', 'github']}
              redirectTo={window.location.origin}
              onlyThirdPartyProviders={false}
              magicLink={false}
              showLinks={true}
              view="sign_in"
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Email',
                    password_label: 'Mật khẩu',
                    button_label: 'Đăng nhập',
                    loading_button_label: 'Đang đăng nhập...',
                    social_provider_text: 'Đăng nhập với {{provider}}',
                    link_text: 'Đã có tài khoản? Đăng nhập',
                  },
                  sign_up: {
                    email_label: 'Email',
                    password_label: 'Mật khẩu',
                    button_label: 'Đăng ký',
                    loading_button_label: 'Đang tạo tài khoản...',
                    social_provider_text: 'Đăng ký với {{provider}}',
                    link_text: 'Chưa có tài khoản? Đăng ký',
                  },
                  forgotten_password: {
                    email_label: 'Email',
                    button_label: 'Gửi hướng dẫn đặt lại mật khẩu',
                    loading_button_label: 'Đang gửi...',
                    link_text: 'Quên mật khẩu?',
                  },
                },
              }}
            />
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Dữ liệu của bạn được mã hóa và lưu trữ an toàn trên PostgreSQL.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
