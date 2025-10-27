from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True,
                                     min_length=6)
    password2 = serializers.CharField(write_only=True,
                                      min_length=6)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password', 'password2')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("El email ya esta en uso.")
        return value
    
    def validate_password(self, value):
        validate_password(value)
        return value
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        
        # Usar el email como username
        email = validated_data['email']
        username = email
        
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        return user
    
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            raise serializers.ValidationError("Debe proporcionar email y contraseña para iniciar sesión.")
        user = authenticate(email=email, password=password)
        if not user:
            raise serializers.ValidationError("Credenciales inválidas.")
        if not user.is_active:
            raise serializers.ValidationError("El usuario está inactivo.")
        data['user'] = user
        return data
    
class UserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'username', 'avatar', 'avatar_url', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at', 'avatar_url')

class AvatarUpdateSerializer(serializers.ModelSerializer):
    """Serializer específico para actualizar solo el avatar"""
    class Meta:
        model = User
        fields = ('avatar',)
        
    def validate_avatar(self, value):
        """Validar el archivo de imagen"""
        if value:
            # Validar tamaño (máximo 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("El archivo es muy grande. Máximo 5MB.")
            
            # Validar tipo de archivo
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Tipo de archivo no permitido. Use JPG, PNG o GIF.")
        
        return value

        