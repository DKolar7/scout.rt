package org.eclipse.scout.rt.platform;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.eclipse.scout.commons.annotations.Order;
import org.eclipse.scout.commons.annotations.Replace;

/**
 * All objects marked with this annotation (or an annotation that has this annotation) are automatically registered in
 * the scout {@link IBeanManager}
 * <p>
 * see also {@link Order}, {@link ApplicationScoped}, and annotations qualified with {@link BeanInvocationHint}
 * <p>
 * The existence of the file
 * <code>src/main/resources/META-INF/services/org.eclipse.scout.rt.platform.IBeanContributor</code> will make scout add
 * all relevant beans in this maven module with {@link IBeanManager#registerClass(Class)}. <br/>
 * These includes classes that satisfy all of the following rules:
 * <ol>
 * <li>class is public or protected</li>
 * <li>class is top level or static inner type</li>
 * <li>class has annotation {@link Bean} or an annotation that itself has the qualifier {@link Bean} (such as
 * {@link ApplicationScoped})</li>
 * </ol>
 * that have a {@link Bean} annotation
 * <p>
 * All implemented classes of this interface are listed in a file
 * <code>src/main/resources/META-INF/services/org.eclipse.scout.rt.platform.IBeanContributor</code> and may manually
 * register custom beans.
 * <p>
 * <h2>Important feature of scout bean handling</h2> When dealing with re-use of code and custom code that changes
 * existing behaviour, the java <code>extends</code> keyword does not distinguish between <b>REPLACE</b> and
 * <b>RE-USE</b> of code. For example there may be a <code>PersonForm</code> and a
 * <code>VIPPersonForm extends PersonForm</code>. Both of them are required at runtime. One is just more specialized and
 * handles special persons. So {@link BEANS#get(Class)} of PersonForm.class should yield an instance of PersonForm
 * whereas {@link BEANS#get(Class)} of VIPPersonForm.class should yield an instance of VIPPersonForm.
 * <p>
 * On the other hand consider the case of <code>PersonForm</code> and <code>PersonFormEx extends PersonForm</code> with
 * the goal of replacing the former PersonForm. Here {@link BEANS#get(Class)} of PersonForm.class should yield an
 * instance of PersonFormEx and also {@link BEANS#get(Class)} of PersonFormEx.class should yield an instance of
 * PersonFormEx.
 * <p>
 * How could the {@link IBeanManager} know which is the case?
 * <p>
 * Here the {@link Replace} annotations enters the stage: The class
 * <code>@Bean @Replace public class PersonFormEx extends PersonForm{...}</code> has the additional {@link Replace}
 * annotation to express the semantics of replacing PersonForm. With that annotation {@link IBeanManager} eliminates the
 * subclassed class and only retains the new subclassing class as runtime.
 * <p>
 * Without that annotation {@link IBeanManager} considers both the subclassed and the subclassing class as two beans
 * that are available at runtime.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.ANNOTATION_TYPE})
@Documented
@Inherited
public @interface Bean {
}
