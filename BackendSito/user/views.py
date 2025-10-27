from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.backends import ModelBackend
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, AvatarUpdateSerializer
from .models import User

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Registro de nuevo usuario"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        return Response({
            'message': 'Usuario registrado exitosamente',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login de usuario"""
    serializer = LoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        return Response({
            'message': 'Login exitoso',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(access_token),
            }
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout - invalidar refresh token"""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        return Response({
            'message': 'Logout exitoso'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Token inválido'
        }, status=status.HTTP_400_BAD_REQUEST)

class UserProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar el perfil del usuario autenticado
    Proporciona automáticamente: GET, PUT, PATCH, DELETE
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Solo retorna el usuario autenticado"""
        return User.objects.filter(id=self.request.user.id)
    
    def get_object(self):
        """Siempre retorna el usuario autenticado"""
        return self.request.user
    
    def list(self, request):
        """GET /profile/ - Obtener perfil del usuario"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """PUT /profile/ - Actualizar perfil completo"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Perfil actualizado exitosamente',
                'user': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def partial_update(self, request, *args, **kwargs):
        """PATCH /profile/ - Actualizar perfil parcial"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'], url_path='avatar/upload')
    def upload_avatar(self, request):
        """POST /profile/avatar/upload/ - Subir avatar"""
        serializer = AvatarUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            # Eliminar avatar anterior si existe
            if request.user.avatar:
                try:
                    request.user.avatar.delete(save=False)
                except:
                    pass
            
            serializer.save()
            user_serializer = UserSerializer(request.user)
            
            return Response({
                'message': 'Avatar actualizado exitosamente',
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['delete'], url_path='avatar/delete')
    def delete_avatar(self, request):
        """DELETE /profile/avatar/delete/ - Eliminar avatar"""
        if request.user.avatar:
            try:
                request.user.avatar.delete(save=True)
                return Response({
                    'message': 'Avatar eliminado exitosamente'
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({
                    'error': 'Error al eliminar avatar'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                'message': 'No hay avatar para eliminar'
            }, status=status.HTTP_404_NOT_FOUND)


class EmailBackend(ModelBackend):
    """
    Backend de autenticación personalizado que permite login con email
    """
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        if email is None:
            email = username
        
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            return None
        
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

